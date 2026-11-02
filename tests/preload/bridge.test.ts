import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/config';
import { DEFAULT_SCHEDULE } from '../../src/core/schedule';
import type { Snapshot } from '../../src/core/scheduler';
import { createBridge } from '../../src/preload/bridge';
import { IPC } from '../../src/shared/ipc';
import { createFakeIpcRenderer } from '../helpers/fake-ipc';

const snapshot: Snapshot = {
  state: { phase: 'warning', restAt: 20_000, restsDone: 0 },
  secondsRemaining: 15,
};

describe('createBridge', () => {
  it('getSnapshot resolves with what main answers', async () => {
    const api = createBridge(createFakeIpcRenderer(snapshot));
    await expect(api.getSnapshot()).resolves.toEqual(snapshot);
  });

  it('getSettings invokes its channel with no arguments and resolves with the answer', async () => {
    const ipc = createFakeIpcRenderer(DEFAULT_CONFIG);
    await expect(createBridge(ipc).getSettings()).resolves.toEqual(DEFAULT_CONFIG);
    expect(ipc.invoked).toEqual([IPC.getSettings.channel]);
    expect(ipc.invokedArgs).toEqual([[]]);
  });

  it('saveSettings invokes its channel with the settings as the only argument', async () => {
    const result = { ok: true, settings: DEFAULT_CONFIG };
    const ipc = createFakeIpcRenderer(result);
    const settings = { ...DEFAULT_CONFIG, postponeMs: 60_000 };

    await expect(createBridge(ipc).saveSettings(settings)).resolves.toEqual(result);

    expect(ipc.invoked).toEqual([IPC.saveSettings.channel]);
    expect(ipc.invokedArgs).toEqual([[settings]]);
  });

  it('getStats invokes its channel with no arguments and resolves with the answer', async () => {
    const days = [{ date: '2026-11-02', taken: 1, skipped: 0, postponed: 0 }];
    const ipc = createFakeIpcRenderer(days);
    await expect(createBridge(ipc).getStats()).resolves.toEqual(days);
    expect(ipc.invoked).toEqual([IPC.getStats.channel]);
    expect(ipc.invokedArgs).toEqual([[]]);
  });

  it('getSchedule invokes its channel with no arguments and resolves with the answer', async () => {
    const ipc = createFakeIpcRenderer(DEFAULT_SCHEDULE);
    await expect(createBridge(ipc).getSchedule()).resolves.toEqual(DEFAULT_SCHEDULE);
    expect(ipc.invoked).toEqual([IPC.getSchedule.channel]);
    expect(ipc.invokedArgs).toEqual([[]]);
  });

  it('saveSchedule invokes its channel with the schedule as the only argument', async () => {
    const result = { ok: true, schedule: DEFAULT_SCHEDULE };
    const ipc = createFakeIpcRenderer(result);
    const schedule = { ...DEFAULT_SCHEDULE, enabled: true };

    await expect(createBridge(ipc).saveSchedule(schedule)).resolves.toEqual(result);

    expect(ipc.invoked).toEqual([IPC.saveSchedule.channel]);
    expect(ipc.invokedArgs).toEqual([[schedule]]);
  });

  it('skip sends the skip channel exactly once', () => {
    const ipc = createFakeIpcRenderer();
    createBridge(ipc).skip();
    expect(ipc.sent).toEqual([IPC.skip.channel]);
  });

  it('postpone sends the postpone channel exactly once', () => {
    const ipc = createFakeIpcRenderer();
    createBridge(ipc).postpone();
    expect(ipc.sent).toEqual([IPC.postpone.channel]);
  });

  it('closeSettings sends its channel exactly once, with no payload', () => {
    const ipc = createFakeIpcRenderer();
    createBridge(ipc).closeSettings();
    expect(ipc.sent).toEqual([IPC.closeSettings.channel]);
  });

  it('delivers pushed snapshots to listeners', () => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    createBridge(ipc).onSnapshot(listener);

    ipc.push(IPC.snapshot.channel, snapshot);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(snapshot);
  });

  it('never exposes the IPC event object to listeners', () => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    createBridge(ipc).onSnapshot(listener);

    ipc.push(IPC.snapshot.channel, snapshot);

    expect(listener.mock.calls[0]).toHaveLength(1);
  });

  it('unsubscribe stops delivery and removes the underlying listener', () => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    const unsubscribe = createBridge(ipc).onSnapshot(listener);
    expect(ipc.listenerCount(IPC.snapshot.channel)).toBe(1);

    unsubscribe();
    ipc.push(IPC.snapshot.channel, snapshot);

    expect(listener).not.toHaveBeenCalled();
    expect(ipc.listenerCount(IPC.snapshot.channel)).toBe(0);
  });

  it('supports several independent subscribers', () => {
    const ipc = createFakeIpcRenderer();
    const api = createBridge(ipc);
    const a = vi.fn();
    const b = vi.fn();
    const offA = api.onSnapshot(a);
    api.onSnapshot(b);

    offA();
    ipc.push(IPC.snapshot.channel, snapshot);

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});

describe('createBridge sound cues', () => {
  it('delivers a valid pushed cue', () => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    createBridge(ipc).onCue(listener);

    ipc.push(IPC.playCue.channel, { cue: 'rest-start', gain: 0.5 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ cue: 'rest-start', gain: 0.5 });
  });

  it.each([
    ['null', null],
    ['a string', 'rest-start'],
    ['an unknown cue', { cue: 'boom', gain: 0.5 }],
    ['no gain', { cue: 'rest-end' }],
    ['a gain over 1', { cue: 'rest-end', gain: 2 }],
    ['a negative gain', { cue: 'rest-end', gain: -0.1 }],
    ['a NaN gain', { cue: 'rest-end', gain: Number.NaN }],
    ['an array', ['rest-end', 1]],
  ])('drops a malformed payload: %s', (_name, payload) => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    createBridge(ipc).onCue(listener);

    ipc.push(IPC.playCue.channel, payload);

    expect(listener).not.toHaveBeenCalled();
  });

  it('never exposes the IPC event object', () => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    createBridge(ipc).onCue(listener);
    ipc.push(IPC.playCue.channel, { cue: 'rest-end', gain: 1 });
    expect(listener.mock.calls[0]).toHaveLength(1);
  });

  it('unsubscribe removes the underlying listener', () => {
    const ipc = createFakeIpcRenderer();
    const off = createBridge(ipc).onCue(vi.fn());
    expect(ipc.listenerCount(IPC.playCue.channel)).toBe(1);
    off();
    expect(ipc.listenerCount(IPC.playCue.channel)).toBe(0);
  });
});

describe('createBridge theme', () => {
  it.each(['system', 'light', 'dark'])('delivers a pushed %s', (preference) => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    createBridge(ipc).onTheme(listener);

    ipc.push(IPC.theme.channel, preference);

    expect(listener).toHaveBeenCalledWith(preference);
  });

  it.each([undefined, null, '', 'Dark', 'blue', 1, { theme: 'dark' }, ['dark']])(
    'drops a malformed payload: %j',
    (payload) => {
      const ipc = createFakeIpcRenderer();
      const listener = vi.fn();
      createBridge(ipc).onTheme(listener);
      ipc.push(IPC.theme.channel, payload);
      expect(listener).not.toHaveBeenCalled();
    },
  );

  it('never exposes the IPC event object, and unsubscribe removes the listener', () => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    const off = createBridge(ipc).onTheme(listener);
    ipc.push(IPC.theme.channel, 'dark');
    expect(listener.mock.calls[0]).toHaveLength(1);

    expect(ipc.listenerCount(IPC.theme.channel)).toBe(1);
    off();
    expect(ipc.listenerCount(IPC.theme.channel)).toBe(0);
  });
});

describe('createBridge exercises', () => {
  it.each([true, false])('delivers a pushed %s', (enabled) => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    createBridge(ipc).onExercises(listener);
    ipc.push(IPC.exercises.channel, enabled);
    expect(listener).toHaveBeenCalledWith(enabled);
  });

  it.each([undefined, null, 'true', 'false', 0, 1, {}, [true]])(
    'drops a non-boolean payload: %j',
    (payload) => {
      const ipc = createFakeIpcRenderer();
      const listener = vi.fn();
      createBridge(ipc).onExercises(listener);
      ipc.push(IPC.exercises.channel, payload);
      expect(listener).not.toHaveBeenCalled();
    },
  );

  it('never exposes the IPC event object, and unsubscribe removes the listener', () => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    const off = createBridge(ipc).onExercises(listener);
    ipc.push(IPC.exercises.channel, true);
    expect(listener.mock.calls[0]).toHaveLength(1);
    expect(ipc.listenerCount(IPC.exercises.channel)).toBe(1);
    off();
    expect(ipc.listenerCount(IPC.exercises.channel)).toBe(0);
  });
});

describe('createBridge shortcuts', () => {
  it('delivers valid hints and drops malformed payloads', () => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    createBridge(ipc).onShortcuts(listener);

    ipc.push(IPC.shortcuts.channel, { skip: 'Ctrl+Alt+Shift+S', postpone: null });
    expect(listener).toHaveBeenCalledWith({ skip: 'Ctrl+Alt+Shift+S', postpone: null });

    for (const payload of [undefined, null, 'x', [], { skip: 'a' }, { skip: 1, postpone: null }]) {
      ipc.push(IPC.shortcuts.channel, payload);
    }
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('never exposes the IPC event object, and unsubscribe removes the listener', () => {
    const ipc = createFakeIpcRenderer();
    const listener = vi.fn();
    const off = createBridge(ipc).onShortcuts(listener);
    ipc.push(IPC.shortcuts.channel, { skip: null, postpone: null });
    expect(listener.mock.calls[0]).toHaveLength(1);
    expect(ipc.listenerCount(IPC.shortcuts.channel)).toBe(1);
    off();
    expect(ipc.listenerCount(IPC.shortcuts.channel)).toBe(0);
  });
});
