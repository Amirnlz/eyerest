import { describe, expect, it, vi } from 'vitest';
import { OverlayWindowManager } from '../../src/main/overlay/overlay-window-manager';
import { createMainRuntime } from '../../src/main/runtime';
import { IPC } from '../../src/shared/ipc';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeTime } from '../helpers/fake-time';
import { FakeDisplays, FakeWindowFactory } from '../helpers/fake-overlay';

const SEC = 1_000;

/** Fast mode: work 20 s, warning from 15 s, rest 5 s, postpone 10 s. */
function setup() {
  const time = new FakeTime();
  const ipcMain = createFakeIpcMain();
  const factory = new FakeWindowFactory();
  const displays = new FakeDisplays();
  const overlay = new OverlayWindowManager(factory, displays);

  const runtime = createMainRuntime({
    env: { EYEREST_FAST: '1' },
    ipcMain,
    getTargets: () => [],
    extraSenders: [overlay],
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
  });

  overlay.start();
  runtime.start();

  const window = () => factory.last;
  return { time, ipcMain, factory, displays, overlay, runtime, window };
}

describe('runtime + overlay window', () => {
  it('keeps the overlay hidden while working', () => {
    const { time, window } = setup();
    time.advance(14 * SEC);
    expect(window().visible).toBe(false);
  });

  it('shows the overlay when the warning starts (15 s before the rest)', () => {
    const { time, window } = setup();
    time.advance(15 * SEC);
    expect(window().visible).toBe(true);
  });

  it('keeps it visible through the warning and the rest, then hides it', () => {
    const { time, window } = setup();
    time.advance(15 * SEC);
    time.advance(5 * SEC);
    expect(window().visible).toBe(true);

    time.advance(5 * SEC);
    expect(window().visible).toBe(false);
  });

  it('never flickers: one show and one hide for a whole warning plus rest', () => {
    const { time, window } = setup();
    time.advance(30 * SEC);

    expect(window().count('showInactive')).toBe(1);
    expect(window().count('hide')).toBe(1);
  });

  it('hides immediately when the user skips the rest', () => {
    const { time, ipcMain, window } = setup();
    time.advance(20 * SEC);
    expect(window().visible).toBe(true);

    ipcMain.emit(IPC.skip.channel);

    expect(window().visible).toBe(false);
  });

  it('hides immediately when the user postpones, and shows again later', () => {
    const { time, ipcMain, window } = setup();
    time.advance(20 * SEC);

    ipcMain.emit(IPC.postpone.channel);
    expect(window().visible).toBe(false);

    time.advance(5 * SEC);
    expect(window().visible).toBe(true);
  });

  it('uses one window for the whole session', () => {
    const { time, factory } = setup();
    time.advance(120 * SEC);
    expect(factory.windows).toHaveLength(1);
  });

  it('a failing overlay does not break the scheduler pipeline', () => {
    const time = new FakeTime();
    const ipcMain = createFakeIpcMain();
    const target = { isDestroyed: () => false, send: vi.fn() };
    const broken = {
      send: () => {
        throw new Error('window crashed');
      },
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const runtime = createMainRuntime({
      env: { EYEREST_FAST: '1' },
      ipcMain,
      getTargets: () => [target],
      extraSenders: [broken],
      schedulerOptions: { clock: time, ticker: time },
    });
    runtime.start();
    time.advance(20 * SEC);

    expect(target.send).toHaveBeenCalled();
    expect(runtime.controller.getSnapshot().state.phase).toBe('resting');
    vi.restoreAllMocks();
  });
});
