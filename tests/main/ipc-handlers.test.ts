import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/config';
import { registerIpcHandlers } from '../../src/main/ipc-handlers';
import { IPC, type SaveSettingsResult } from '../../src/shared/ipc';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { WORKING } from '../helpers/fake-api';

function setup() {
  const controller = {
    getSnapshot: vi.fn(() => WORKING),
    skip: vi.fn(),
    postpone: vi.fn(),
  };
  const settings = {
    getSettings: vi.fn(() => DEFAULT_CONFIG),
    saveSettings: vi.fn<(payload: unknown) => SaveSettingsResult>((payload) => ({
      ok: false,
      error: `rejected ${JSON.stringify(payload)}`,
    })),
    closeSettings: vi.fn(),
  };
  const ipc = createFakeIpcMain();
  const dispose = registerIpcHandlers(ipc, controller, settings);
  return { controller, settings, ipc, dispose };
}

describe('registerIpcHandlers', () => {
  it('answers getSnapshot with the controller snapshot', () => {
    const { ipc, controller } = setup();
    expect(ipc.invoke(IPC.getSnapshot.channel)).toBe(WORKING);
    expect(controller.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it('forwards skip to the controller once, and not postpone', () => {
    const { ipc, controller } = setup();
    ipc.emit(IPC.skip.channel);
    expect(controller.skip).toHaveBeenCalledTimes(1);
    expect(controller.postpone).not.toHaveBeenCalled();
  });

  it('forwards postpone to the controller once, and not skip', () => {
    const { ipc, controller } = setup();
    ipc.emit(IPC.postpone.channel);
    expect(controller.postpone).toHaveBeenCalledTimes(1);
    expect(controller.skip).not.toHaveBeenCalled();
  });

  it('answers getSettings with the settings service value', () => {
    const { ipc, settings } = setup();
    expect(ipc.invoke(IPC.getSettings.channel)).toBe(DEFAULT_CONFIG);
    expect(settings.getSettings).toHaveBeenCalledTimes(1);
  });

  it('passes the saveSettings payload through untouched and returns the result', () => {
    const { ipc, settings } = setup();
    const payload = { workIntervalMs: 'not validated here' };

    const result = ipc.invoke(IPC.saveSettings.channel, payload);

    expect(settings.saveSettings).toHaveBeenCalledTimes(1);
    expect(settings.saveSettings).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ ok: false, error: 'rejected {"workIntervalMs":"not validated here"}' });
  });

  it('does not pass the IPC event to the settings service', () => {
    const { ipc, settings } = setup();
    ipc.invoke(IPC.saveSettings.channel, { a: 1 });
    expect(settings.saveSettings.mock.calls[0]).toHaveLength(1);
  });

  it('forwards closeSettings to the settings side once, and nothing else', () => {
    const { ipc, settings, controller } = setup();
    ipc.emit(IPC.closeSettings.channel);
    expect(settings.closeSettings).toHaveBeenCalledTimes(1);
    expect(controller.skip).not.toHaveBeenCalled();
    expect(controller.postpone).not.toHaveBeenCalled();
  });

  it('removes every handler on dispose', () => {
    const { ipc, dispose } = setup();
    expect(ipc.handlers.size + ipc.listeners.size).toBe(6);

    dispose();

    expect(ipc.handlers.size).toBe(0);
    expect(ipc.listeners.size).toBe(0);
  });
});
