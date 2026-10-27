import { describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '../../src/core/scheduler';
import { createMainRuntime } from '../../src/main/runtime';
import type { WebContentsLike } from '../../src/main/snapshot-sender';
import { IPC } from '../../src/shared/ipc';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeTime } from '../helpers/fake-time';

const SEC = 1_000;

function setup(env: Record<string, string> = { EYEREST_FAST: '1' }) {
  const time = new FakeTime();
  const ipcMain = createFakeIpcMain();
  const pushed: Snapshot[] = [];
  const target: WebContentsLike = {
    isDestroyed: () => false,
    send: vi.fn((channel: string, snapshot: unknown) => {
      if (channel === IPC.snapshot.channel) pushed.push(snapshot as Snapshot);
    }),
  };

  const runtime = createMainRuntime({
    env,
    ipcMain,
    getTargets: () => [target],
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
  });

  return { time, ipcMain, pushed, runtime, target };
}

const lastPhase = (pushed: Snapshot[]) => pushed.at(-1)?.state.phase;

describe('createMainRuntime', () => {
  it('registers IPC handlers immediately and pushes nothing before start', () => {
    const { ipcMain, pushed } = setup();
    expect(ipcMain.handlers.has(IPC.getSnapshot.channel)).toBe(true);
    expect(pushed).toHaveLength(0);
  });

  it('answers getSnapshot with idle before start', () => {
    const { ipcMain } = setup();
    expect(ipcMain.invoke(IPC.getSnapshot.channel)).toEqual({
      state: { phase: 'idle' },
      secondsRemaining: null,
    });
  });

  it('pushes working on start and walks through warning and rest (fast mode)', () => {
    const { time, pushed, runtime } = setup();
    runtime.start();
    expect(lastPhase(pushed)).toBe('working');

    time.advance(15 * SEC);
    expect(lastPhase(pushed)).toBe('warning');
    expect(pushed.at(-1)?.secondsRemaining).toBe(5);

    time.advance(5 * SEC);
    expect(lastPhase(pushed)).toBe('resting');
    expect(pushed.at(-1)?.secondsRemaining).toBe(5);

    time.advance(5 * SEC);
    expect(lastPhase(pushed)).toBe('working');
  });

  it('uses the real spec durations without the fast flag', () => {
    const { time, pushed, runtime } = setup({});
    runtime.start();

    time.advance(19 * 60 * SEC);
    expect(lastPhase(pushed)).toBe('working');

    time.advance(60 * SEC - 15 * SEC);
    expect(lastPhase(pushed)).toBe('warning');
  });

  it('skip from the renderer ends the rest and pushes working', () => {
    const { time, ipcMain, pushed, runtime } = setup();
    runtime.start();
    time.advance(20 * SEC);
    expect(lastPhase(pushed)).toBe('resting');

    ipcMain.emit(IPC.skip.channel);

    expect(lastPhase(pushed)).toBe('working');
    expect(pushed.at(-1)?.state).toMatchObject({ restsDone: 1 });
  });

  it('postpone from the renderer delays the rest by the postpone duration', () => {
    const { time, ipcMain, pushed, runtime } = setup();
    runtime.start();
    time.advance(20 * SEC);

    ipcMain.emit(IPC.postpone.channel);
    expect(lastPhase(pushed)).toBe('working');
    expect(pushed.at(-1)?.state).toMatchObject({ restAt: 30 * SEC, restsDone: 0 });

    time.advance(10 * SEC);
    expect(lastPhase(pushed)).toBe('resting');
  });

  it('skip and postpone are ignored when not resting', () => {
    const { time, ipcMain, pushed, runtime } = setup();
    runtime.start();
    time.advance(5 * SEC);
    const before = pushed.length;

    ipcMain.emit(IPC.skip.channel);
    ipcMain.emit(IPC.postpone.channel);

    expect(pushed).toHaveLength(before);
    expect(lastPhase(pushed)).toBe('working');
  });

  it('getSnapshot reflects the live state', () => {
    const { time, ipcMain, runtime } = setup();
    runtime.start();
    time.advance(20 * SEC);

    const snapshot = ipcMain.invoke(IPC.getSnapshot.channel) as Snapshot;
    expect(snapshot.state.phase).toBe('resting');
  });

  it('dispose removes handlers, stops the ticker and stops pushing', () => {
    const { time, ipcMain, pushed, runtime } = setup();
    runtime.start();
    const before = pushed.length;

    runtime.dispose();
    time.advance(60 * SEC);

    expect(ipcMain.handlers.size + ipcMain.listeners.size).toBe(0);
    expect(time.activeTickers).toBe(0);
    expect(pushed).toHaveLength(before);
  });
});
