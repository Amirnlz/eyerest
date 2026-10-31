import type { RestConfig } from '../core/config';
import type { Snapshot } from '../core/scheduler';
import { IPC, type IpcMainLike, type SaveSettingsResult } from '../shared/ipc';

/** What the IPC layer needs from the app. */
export interface IpcController {
  getSnapshot(): Snapshot;
  skip(): void;
  postpone(): void;
}

/**
 * What the settings channels need. `saveSettings` takes `unknown` on purpose:
 * the payload comes from a renderer and is validated behind this boundary.
 */
export interface IpcSettings {
  getSettings(): RestConfig;
  saveSettings(payload: unknown): SaveSettingsResult;
}

/**
 * Registers a handler for every renderer-to-main channel in the IPC contract.
 * Returns a function that removes them again.
 */
export function registerIpcHandlers(
  ipc: IpcMainLike,
  controller: IpcController,
  settings: IpcSettings,
): () => void {
  const onSkip = () => controller.skip();
  const onPostpone = () => controller.postpone();

  ipc.handle(IPC.getSnapshot.channel, () => controller.getSnapshot());
  ipc.handle(IPC.getSettings.channel, () => settings.getSettings());
  ipc.handle(IPC.saveSettings.channel, (_event, payload) => settings.saveSettings(payload));
  ipc.on(IPC.skip.channel, onSkip);
  ipc.on(IPC.postpone.channel, onPostpone);

  return () => {
    ipc.removeHandler(IPC.getSnapshot.channel);
    ipc.removeHandler(IPC.getSettings.channel);
    ipc.removeHandler(IPC.saveSettings.channel);
    ipc.removeListener(IPC.skip.channel, onSkip);
    ipc.removeListener(IPC.postpone.channel, onPostpone);
  };
}
