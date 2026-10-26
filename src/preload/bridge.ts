import type { Snapshot } from '../core/scheduler';
import { IPC, type EyerestApi, type IpcRendererLike } from '../shared/ipc';

/**
 * Builds the API exposed to the renderer. Pure with respect to Electron:
 * it only needs an `ipcRenderer`-shaped object, so it is unit-testable.
 *
 * The IPC event object is never handed to the renderer; listeners only
 * receive the snapshot payload.
 */
export function createBridge(ipc: IpcRendererLike): EyerestApi {
  return {
    getSnapshot: () => ipc.invoke(IPC.getSnapshot.channel) as Promise<Snapshot>,

    onSnapshot(listener) {
      const handler = (_event: unknown, snapshot: unknown) => listener(snapshot as Snapshot);
      ipc.on(IPC.snapshot.channel, handler);
      return () => ipc.removeListener(IPC.snapshot.channel, handler);
    },

    skip: () => ipc.send(IPC.skip.channel),
    postpone: () => ipc.send(IPC.postpone.channel),
  };
}
