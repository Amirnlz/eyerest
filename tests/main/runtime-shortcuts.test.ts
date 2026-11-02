import { describe, expect, it } from 'vitest';
import { createMainRuntime } from '../../src/main/runtime';
import { DEFAULT_ACCELERATORS } from '../../src/main/shortcuts/accelerators';
import { ShortcutController } from '../../src/main/shortcuts/shortcut-controller';
import type { ShortcutHints } from '../../src/shared/shortcuts';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeShortcutRegistrar } from '../helpers/fake-shortcuts';
import { FakeTime } from '../helpers/fake-time';

const SEC = 1_000;
const SKIP = DEFAULT_ACCELERATORS.skip;
const POSTPONE = DEFAULT_ACCELERATORS.postpone;

/** Fast mode: warning from 5 s, rest due at 20 s and lasting 5 s, postpone 10 s. */
function setup() {
  const time = new FakeTime();
  const registrar = new FakeShortcutRegistrar();
  const pushed: ShortcutHints[] = [];
  // The runtime exists only after its senders, as in the app: the target is read lazily.
  let runtime: ReturnType<typeof createMainRuntime> | null = null;
  const shortcuts = new ShortcutController(
    registrar,
    () => runtime?.controller,
    { push: (hints) => pushed.push(hints) },
    { platform: 'linux' },
  );
  runtime = createMainRuntime({
    env: { EYEREST_FAST: '1' },
    ipcMain: createFakeIpcMain(),
    getTargets: () => [],
    extraSenders: [shortcuts],
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
  });
  runtime.start();
  const started = runtime;
  return {
    registrar,
    pushed,
    controller: started.controller,
    phase: () => started.controller.getSnapshot().state.phase,
    advance: (seconds: number) => time.advance(seconds * SEC),
  };
}

describe('global shortcuts through the runtime', () => {
  it('holds no key during work and the heads-up, and both during the rest', () => {
    const { registrar, advance, phase } = setup();
    advance(10);
    expect(phase()).toBe('warning');
    expect(registrar.registered).toEqual([]);

    advance(10);
    expect(phase()).toBe('resting');
    expect(registrar.registered).toEqual([POSTPONE, SKIP].sort());
  });

  it('Skip key ends the rest, counts toward the cycle, and releases both keys', () => {
    const { registrar, advance, phase, controller } = setup();
    advance(20);
    registrar.press(SKIP);

    expect(phase()).toBe('working');
    expect(controller.getSnapshot().state).toMatchObject({ restsDone: 1 });
    expect(registrar.registered).toEqual([]);
  });

  it('Postpone key moves the next rest by the postpone length, without consuming a slot', () => {
    const { registrar, advance, phase, controller } = setup();
    advance(20);
    registrar.press(POSTPONE);

    expect(phase()).toBe('working');
    expect(controller.getSnapshot().state).toMatchObject({ restAt: 20_000 + 10_000, restsDone: 0 });
    expect(registrar.registered).toEqual([]);
  });

  it('releases the keys when the rest runs out, and takes them again for the next rest', () => {
    const { registrar, advance, phase } = setup();
    advance(25);
    expect(phase()).toBe('working');
    expect(registrar.registered).toEqual([]);

    advance(20);
    expect(phase()).toBe('resting');
    expect(registrar.registered).toHaveLength(2);
  });

  it('releases the keys when reminders are paused mid-rest', () => {
    const { registrar, advance, controller } = setup();
    advance(20);
    controller.pause();
    expect(registrar.registered).toEqual([]);
  });

  it('releases the keys when do not disturb ends the rest', () => {
    const { registrar, advance, controller, phase } = setup();
    advance(20);
    controller.setQuiet(true);
    expect(phase()).toBe('working');
    expect(registrar.registered).toEqual([]);
  });

  it('a key pressed after the rest ended changes nothing', () => {
    const { registrar, advance, phase, controller } = setup();
    advance(20);
    const staleSkip = registrar.handlers.get(SKIP);
    advance(5);
    expect(phase()).toBe('working');
    const before = controller.getSnapshot().state;

    // The OS can still deliver a press that was in flight when the key was released.
    staleSkip?.();

    expect(controller.getSnapshot().state).toEqual(before);
  });

  it('announces the hints with the rest and clears them after it', () => {
    const { advance, pushed, registrar } = setup();
    advance(20);
    registrar.press(SKIP);
    expect(pushed).toEqual([
      { skip: 'Ctrl+Alt+Shift+S', postpone: 'Ctrl+Alt+Shift+P' },
      { skip: null, postpone: null },
    ]);
  });
});
