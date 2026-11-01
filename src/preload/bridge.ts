import type { RestConfig } from '../core/config';
import type { Snapshot } from '../core/scheduler';
import {
  IPC,
  type EyerestApi,
  type IpcRendererLike,
  type SaveSettingsResult,
} from '../shared/ipc';
import { parsePlayCue } from '../shared/sound';
import { isThemePreference } from '../shared/theme';

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

    getSettings: () => ipc.invoke(IPC.getSettings.channel) as Promise<RestConfig>,
    saveSettings: (settings) =>
      ipc.invoke(IPC.saveSettings.channel, settings) as Promise<SaveSettingsResult>,

    onSnapshot(listener) {
      const handler = (_event: unknown, snapshot: unknown) => listener(snapshot as Snapshot);
      ipc.on(IPC.snapshot.channel, handler);
      return () => ipc.removeListener(IPC.snapshot.channel, handler);
    },

    onCue(listener) {
      const handler = (_event: unknown, payload: unknown) => {
        const cue = parsePlayCue(payload);
        if (cue !== null) listener(cue);
      };
      ipc.on(IPC.playCue.channel, handler);
      return () => ipc.removeListener(IPC.playCue.channel, handler);
    },

    onTheme(listener) {
      const handler = (_event: unknown, payload: unknown) => {
        if (isThemePreference(payload)) listener(payload);
      };
      ipc.on(IPC.theme.channel, handler);
      return () => ipc.removeListener(IPC.theme.channel, handler);
    },

    onExercises(listener) {
      const handler = (_event: unknown, payload: unknown) => {
        if (typeof payload === 'boolean') listener(payload);
      };
      ipc.on(IPC.exercises.channel, handler);
      return () => ipc.removeListener(IPC.exercises.channel, handler);
    },

    skip: () => ipc.send(IPC.skip.channel),
    postpone: () => ipc.send(IPC.postpone.channel),
    closeSettings: () => ipc.send(IPC.closeSettings.channel),
  };
}
