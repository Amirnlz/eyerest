import { describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '../../src/core/scheduler';
import { DEFAULT_ACCELERATORS } from '../../src/main/shortcuts/accelerators';
import { ShortcutController } from '../../src/main/shortcuts/shortcut-controller';
import { NO_SHORTCUT_HINTS, type ShortcutHints } from '../../src/shared/shortcuts';
import { FakeShortcutRegistrar } from '../helpers/fake-shortcuts';

const SKIP = DEFAULT_ACCELERATORS.skip;
const POSTPONE = DEFAULT_ACCELERATORS.postpone;

const idle: Snapshot = { state: { phase: 'idle' }, secondsRemaining: null };
const working: Snapshot = {
  state: { phase: 'working', restAt: 20_000, restsDone: 0 },
  secondsRemaining: null,
};
const warning: Snapshot = {
  state: { phase: 'warning', restAt: 20_000, restsDone: 0 },
  secondsRemaining: 10,
};
const away: Snapshot = {
  state: { phase: 'away', since: 0, remainingMs: 1, restsDone: 0 },
  secondsRemaining: null,
};
const resting = (seconds = 20): Snapshot => ({
  state: { phase: 'resting', kind: 'eye', endsAt: 25_000, restsDone: 0 },
  secondsRemaining: seconds,
});

function setup(
  options: { enabled?: boolean; platform?: NodeJS.Platform; target?: boolean } = {},
) {
  const registrar = new FakeShortcutRegistrar();
  const target = { skip: vi.fn(), postpone: vi.fn() };
  const pushed: ShortcutHints[] = [];
  const log: string[] = [];
  const controller = new ShortcutController(
    registrar,
    () => (options.target === false ? undefined : target),
    { push: (hints) => pushed.push(hints) },
    {
      enabled: options.enabled,
      platform: options.platform ?? 'linux',
      log: (message) => log.push(message),
    },
  );
  return { controller, registrar, target, pushed, log };
}

describe('ShortcutController', () => {
  it('registers nothing outside a rest', () => {
    const { controller, registrar, pushed } = setup();
    for (const snapshot of [idle, working, warning, away]) controller.send(snapshot);
    expect(registrar.calls).toEqual([]);
    expect(pushed).toEqual([]);
  });

  it('registers both keys when a rest starts and announces them as the person reads them', () => {
    const { controller, registrar, pushed } = setup();
    controller.send(resting());
    expect(registrar.registered).toEqual([POSTPONE, SKIP].sort());
    expect(pushed).toEqual([{ skip: 'Ctrl+Alt+Shift+S', postpone: 'Ctrl+Alt+Shift+P' }]);
  });

  it('formats the hints for the platform', () => {
    const { controller, pushed } = setup({ platform: 'darwin' });
    controller.send(resting());
    expect(pushed[0]).toEqual({ skip: '⌥⇧⌘S', postpone: '⌥⇧⌘P' });
  });

  it('does nothing on the repeated snapshots of one rest', () => {
    const { controller, registrar, pushed } = setup();
    controller.send(resting(20));
    controller.send(resting(19));
    controller.send(resting(18));
    expect(registrar.calls).toEqual([`register ${SKIP}`, `register ${POSTPONE}`]);
    expect(pushed).toHaveLength(1);
  });

  it.each([
    ['completes into work', working],
    ['is paused', idle],
  ])('releases both keys and clears the hints when the rest %s', (_name, next) => {
    const { controller, registrar, pushed } = setup();
    controller.send(resting());
    controller.send(next);
    expect(registrar.registered).toEqual([]);
    expect(registrar.calls.filter((call) => call.startsWith('unregister'))).toEqual([
      `unregister ${SKIP}`,
      `unregister ${POSTPONE}`,
    ]);
    expect(pushed.at(-1)).toEqual(NO_SHORTCUT_HINTS);
  });

  it('registers again for the next rest', () => {
    const { controller, registrar, pushed } = setup();
    controller.send(resting());
    controller.send(working);
    controller.send(resting());
    expect(registrar.registered).toHaveLength(2);
    expect(pushed).toHaveLength(3);
  });

  it('runs Skip and Postpone through the target, one call each', () => {
    const { controller, registrar, target } = setup();
    controller.send(resting());

    registrar.press(SKIP);
    expect(target.skip).toHaveBeenCalledTimes(1);
    expect(target.postpone).not.toHaveBeenCalled();

    registrar.press(POSTPONE);
    expect(target.postpone).toHaveBeenCalledTimes(1);
  });

  it('presses nothing once released: a key is not live outside a rest', () => {
    const { controller, registrar, target } = setup();
    controller.send(resting());
    controller.send(working);
    registrar.press(SKIP);
    registrar.press(POSTPONE);
    expect(target.skip).not.toHaveBeenCalled();
    expect(target.postpone).not.toHaveBeenCalled();
  });

  it('survives a target that is not there yet and one that throws', () => {
    const missing = setup({ target: false });
    missing.controller.send(resting());
    expect(() => missing.registrar.press(SKIP)).not.toThrow();

    const failing = setup();
    failing.target.skip.mockImplementation(() => {
      throw new Error('scheduler down');
    });
    failing.controller.send(resting());
    expect(() => failing.registrar.press(SKIP)).not.toThrow();
    expect(failing.log).toEqual([expect.stringContaining('skip shortcut failed')]);
  });

  describe('when the OS refuses a key', () => {
    it('keeps the other one and hints only the accepted one', () => {
      const { controller, registrar, pushed, log } = setup();
      registrar.refused.add(SKIP);
      controller.send(resting());

      expect(registrar.registered).toEqual([POSTPONE]);
      expect(pushed).toEqual([{ skip: null, postpone: 'Ctrl+Alt+Shift+P' }]);
      expect(log).toEqual([expect.stringContaining('refused')]);
    });

    it('does not release a key it never got', () => {
      const { controller, registrar } = setup();
      registrar.refused.add(SKIP);
      controller.send(resting());
      controller.send(working);
      expect(registrar.calls).not.toContain(`unregister ${SKIP}`);
      expect(registrar.calls).toContain(`unregister ${POSTPONE}`);
    });

    it('hints nothing when both are refused', () => {
      const { controller, registrar, pushed } = setup();
      registrar.refused.add(SKIP);
      registrar.refused.add(POSTPONE);
      controller.send(resting());
      expect(pushed).toEqual([NO_SHORTCUT_HINTS]);
    });

    it('treats a registrar that throws like a refusal', () => {
      const { controller, registrar, pushed, log } = setup();
      registrar.throwing.add(POSTPONE);
      controller.send(resting());
      expect(pushed).toEqual([{ skip: 'Ctrl+Alt+Shift+S', postpone: null }]);
      expect(log).toEqual([expect.stringContaining('could not register')]);
    });
  });

  it('keeps going when releasing a key fails, and still clears the hints', () => {
    const { controller, registrar, pushed, log } = setup();
    controller.send(resting());
    registrar.unregisterError = new Error('nope');
    expect(() => controller.send(working)).not.toThrow();
    expect(pushed.at(-1)).toEqual(NO_SHORTCUT_HINTS);
    expect(log.filter((line) => line.includes('could not release'))).toHaveLength(2);
  });

  it('survives an output that throws', () => {
    const registrar = new FakeShortcutRegistrar();
    const log: string[] = [];
    const controller = new ShortcutController(
      registrar,
      () => undefined,
      {
        push: () => {
          throw new Error('window gone');
        },
      },
      { platform: 'linux', log: (message) => log.push(message) },
    );
    expect(() => controller.send(resting())).not.toThrow();
    expect(registrar.registered).toHaveLength(2);
    expect(log).toEqual([expect.stringContaining('could not push')]);
  });

  describe('when disabled', () => {
    it('never registers or announces anything', () => {
      const { controller, registrar, pushed } = setup({ enabled: false });
      controller.send(resting());
      controller.send(working);
      expect(registrar.calls).toEqual([]);
      expect(pushed).toEqual([]);
    });
  });

  describe('dispose', () => {
    it('releases the keys of a rest in progress', () => {
      const { controller, registrar } = setup();
      controller.send(resting());
      controller.dispose();
      expect(registrar.registered).toEqual([]);
    });

    it('does nothing when no rest is showing, and twice is safe', () => {
      const { controller, registrar } = setup();
      controller.dispose();
      controller.send(resting());
      controller.dispose();
      controller.dispose();
      expect(registrar.calls.filter((call) => call.startsWith('unregister'))).toHaveLength(2);
    });
  });

  it('refuses two actions on the same key', () => {
    expect(
      () =>
        new ShortcutController(
          new FakeShortcutRegistrar(),
          () => undefined,
          { push: () => undefined },
          { platform: 'linux', accelerators: { skip: 'Ctrl+K', postpone: 'Ctrl+K' } },
        ),
    ).toThrow(RangeError);
  });
});
