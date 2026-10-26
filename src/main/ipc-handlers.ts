import type { Snapshot } from '../core/scheduler';
import { IPC, type IpcMainLike } from '../shared/ipc';

/** What the IPC layer needs from the app. */
export interface IpcController {
  getSnapshot(): Snapshot;
  skip(): void;
  postpone(): void;
}

/**
 * Registers a handler for every renderer-to-main channel in the IPC contract.
 * Returns a function that removes them again.
 */
export function registerIpcHandlers(ipc: IpcMainLike, controller: IpcController): () => void {
  const onSkip = () => controller.skip();
  const onPostpone = () => controller.postpone();

  ipc.handle(IPC.getSnapshot.channel, () => controller.getSnapshot());
  ipc.on(IPC.skip.channel, onSkip);
  ipc.on(IPC.postpone.channel, onPostpone);

  return () => {
    ipc.removeHandler(IPC.getSnapshot.channel);
    ipc.removeListener(IPC.skip.channel, onSkip);
    ipc.removeListener(IPC.postpone.channel, onPostpone);
  };
}
