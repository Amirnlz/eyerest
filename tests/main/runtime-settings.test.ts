import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, type RestConfig } from '../../src/core/config';
import type { Snapshot } from '../../src/core/scheduler';
import { createMainRuntime } from '../../src/main/runtime';
import { IPC, type SaveSettingsResult } from '../../src/shared/ipc';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeTime } from '../helpers/fake-time';

const MIN = 60_000;
const SEC = 1_000;

function setup(
  options: {
    settingsOverrides?: Partial<RestConfig>;
    failSave?: boolean;
    closeSettingsWindow?: () => void;
  } = {},
) {
  const time = new FakeTime();
  const ipcMain = createFakeIpcMain();
  const pushed: Snapshot[] = [];
  const saved: Partial<RestConfig>[] = [];

  const runtime = createMainRuntime({
    env: {},
    settingsOverrides: options.settingsOverrides,
    closeSettingsWindow: options.closeSettingsWindow,
    settingsStorage: {
      save: (overrides) => {
        if (options.failSave) throw new Error('disk full');
        saved.push(overrides);
      },
    },
    ipcMain,
    getTargets: () => [
      {
        isDestroyed: () => false,
        send: (_channel: string, snapshot: unknown) => pushed.push(snapshot as Snapshot),
      },
    ],
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
  });

  const save = (settings: unknown) =>
    ipcMain.invoke(IPC.saveSettings.channel, settings) as SaveSettingsResult;
  return { time, ipcMain, pushed, saved, runtime, save };
}

describe('settings through the main runtime', () => {
  it('answers getSettings with defaults, or with the settings file values', () => {
    expect(setup().ipcMain.invoke(IPC.getSettings.channel)).toEqual(DEFAULT_CONFIG);

    const custom = setup({ settingsOverrides: { workIntervalMs: 30 * MIN } });
    expect(custom.ipcMain.invoke(IPC.getSettings.channel)).toEqual({
      ...DEFAULT_CONFIG,
      workIntervalMs: 30 * MIN,
    });
  });

  it('saving while running restarts the cycle with the new work interval', () => {
    const { time, pushed, runtime, save, saved } = setup();
    runtime.start();
    time.advance(5 * MIN);

    expect(save({ ...DEFAULT_CONFIG, workIntervalMs: 10 * MIN }).ok).toBe(true);

    expect(saved).toEqual([{ workIntervalMs: 10 * MIN }]);
    expect(pushed.at(-1)?.state).toEqual({
      phase: 'working',
      restAt: 15 * MIN,
      restsDone: 0,
    });

    time.advance(10 * MIN - 15 * SEC);
    expect(pushed.at(-1)?.state.phase).toBe('warning');
  });

  it('the new rest length applies to the next rest', () => {
    const { time, pushed, runtime, save } = setup();
    runtime.start();
    save({ ...DEFAULT_CONFIG, eyeRestMs: 40 * SEC });

    time.advance(20 * MIN);

    expect(pushed.at(-1)?.state.phase).toBe('resting');
    expect(pushed.at(-1)?.secondsRemaining).toBe(40);
  });

  it('saving while paused does not start reminders', () => {
    const { time, pushed, runtime, save } = setup();
    runtime.start();
    runtime.controller.pause();
    const before = pushed.length;

    save({ ...DEFAULT_CONFIG, workIntervalMs: 10 * MIN });
    time.advance(30 * MIN);

    expect(pushed).toHaveLength(before);
    expect(runtime.controller.getSnapshot().state.phase).toBe('idle');

    runtime.controller.resume();
    expect(runtime.controller.getSnapshot().state).toMatchObject({
      phase: 'working',
      restAt: 30 * MIN + 10 * MIN,
    });
  });

  it('saving unchanged values does not restart the running cycle', () => {
    const { time, pushed, runtime, save } = setup();
    runtime.start();
    time.advance(5 * MIN);
    const before = pushed.length;

    expect(save({ ...DEFAULT_CONFIG }).ok).toBe(true);

    expect(pushed).toHaveLength(before);
    expect(runtime.controller.getSnapshot().state).toMatchObject({ restAt: 20 * MIN });
  });

  it('a rejected payload leaves the running cycle and the disk alone', () => {
    const { time, runtime, save, saved } = setup();
    runtime.start();
    time.advance(5 * MIN);

    const result = save({ ...DEFAULT_CONFIG, warningMs: 30 * MIN });

    expect(result.ok).toBe(false);
    expect(saved).toEqual([]);
    expect(runtime.controller.getSnapshot().state).toMatchObject({ restAt: 20 * MIN });
  });

  it('a failed disk write leaves the running cycle alone', () => {
    const { time, runtime, save } = setup({ failSave: true });
    runtime.start();
    time.advance(5 * MIN);

    const result = save({ ...DEFAULT_CONFIG, workIntervalMs: 10 * MIN });

    expect(result.ok).toBe(false);
    expect(runtime.controller.getSnapshot().state).toMatchObject({ restAt: 20 * MIN });
  });

  it('closeSettings reaches the window closer', () => {
    const closeSettingsWindow = vi.fn();
    const { ipcMain } = setup({ closeSettingsWindow });
    ipcMain.emit(IPC.closeSettings.channel);
    expect(closeSettingsWindow).toHaveBeenCalledTimes(1);
  });

  it('closeSettings without a window closer is a no-op', () => {
    const { ipcMain } = setup();
    expect(() => ipcMain.emit(IPC.closeSettings.channel)).not.toThrow();
  });

  it('removes the settings handlers on dispose', () => {
    const { ipcMain, runtime } = setup();
    runtime.dispose();
    expect(ipcMain.handlers.has(IPC.getSettings.channel)).toBe(false);
    expect(ipcMain.handlers.has(IPC.saveSettings.channel)).toBe(false);
  });
});
