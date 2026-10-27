import { describe, expect, it, vi } from 'vitest';
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
