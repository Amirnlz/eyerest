import { describe, expect, it } from 'vitest';
import { createBridge } from '../../src/preload/bridge';
import { registerIpcHandlers } from '../../src/main/ipc-handlers';
import { DEFAULT_CONFIG } from '../../src/core/config';
import { channelsOfKind, IPC } from '../../src/shared/ipc';
import { createFakeIpcMain, createFakeIpcRenderer } from '../helpers/fake-ipc';

const allChannels = Object.values(IPC).map((entry) => entry.channel);

const controller = {
  getSnapshot: () => ({ state: { phase: 'idle' as const }, secondsRemaining: null }),
  skip: () => {},
  postpone: () => {},
};

const settings = {
  getSettings: () => DEFAULT_CONFIG,
  saveSettings: () => ({ ok: true as const, settings: DEFAULT_CONFIG }),
  closeSettings: () => {},
};

describe('IPC contract', () => {
  it('uses unique channel names', () => {
    expect(new Set(allChannels).size).toBe(allChannels.length);
  });

  it('namespaces every channel', () => {
    for (const channel of allChannels) expect(channel).toMatch(/^eyerest:[a-z-]+$/);
  });

  it('has a main-side handler for every invoke and send channel, and none for push', () => {
    const ipc = createFakeIpcMain();
    registerIpcHandlers(ipc, controller, settings);

    const registered = [...ipc.handlers.keys(), ...ipc.listeners.keys()].sort();
    const expected = [...channelsOfKind('invoke'), ...channelsOfKind('send')].sort();

    expect(registered).toEqual(expected);
    for (const channel of channelsOfKind('push')) {
      expect(registered).not.toContain(channel);
    }
  });

  it('has a preload binding for every channel', async () => {
    const ipc = createFakeIpcRenderer({ state: { phase: 'idle' }, secondsRemaining: null });
    const api = createBridge(ipc);

    await api.getSnapshot();
    await api.getSettings();
    await api.saveSettings(DEFAULT_CONFIG);
    api.skip();
    api.postpone();
    api.closeSettings();
    api.onSnapshot(() => {});

    expect([...new Set(ipc.touched)].sort()).toEqual([...allChannels].sort());
  });

  it('uses the right call style per kind in the preload', async () => {
    const ipc = createFakeIpcRenderer();
    const api = createBridge(ipc);

    await api.getSnapshot();
    await api.getSettings();
    await api.saveSettings(DEFAULT_CONFIG);
    api.skip();
    api.postpone();
    api.closeSettings();

    expect(ipc.invoked).toEqual(channelsOfKind('invoke'));
    expect(ipc.sent.sort()).toEqual(channelsOfKind('send').sort());
  });
});
