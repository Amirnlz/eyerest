import { describe, expect, it, vi } from 'vitest';
import { registerIpcHandlers } from '../../src/main/ipc-handlers';
import { IPC } from '../../src/shared/ipc';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { WORKING } from '../helpers/fake-api';

function setup() {
  const controller = {
    getSnapshot: vi.fn(() => WORKING),
    skip: vi.fn(),
    postpone: vi.fn(),
  };
  const ipc = createFakeIpcMain();
  const dispose = registerIpcHandlers(ipc, controller);
  return { controller, ipc, dispose };
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

  it('removes every handler on dispose', () => {
    const { ipc, dispose } = setup();
    expect(ipc.handlers.size + ipc.listeners.size).toBe(3);

    dispose();

    expect(ipc.handlers.size).toBe(0);
    expect(ipc.listeners.size).toBe(0);
  });
});
