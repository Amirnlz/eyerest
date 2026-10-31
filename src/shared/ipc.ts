import type { RestConfig } from '../core/config';
import type { Snapshot } from '../core/scheduler';

/**
 * Single source of truth for IPC between main, preload and renderer.
 * No other file may contain a channel name string.
 *
 * kinds:
 * - invoke: renderer asks, main answers (request/response)
 * - send:   renderer tells main (fire and forget)
 * - push:   main tells renderer (broadcast)
 */
export type IpcKind = 'invoke' | 'send' | 'push';

export const IPC = {
  getSnapshot: { channel: 'eyerest:get-snapshot', kind: 'invoke' },
  getSettings: { channel: 'eyerest:get-settings', kind: 'invoke' },
  saveSettings: { channel: 'eyerest:save-settings', kind: 'invoke' },
  skip: { channel: 'eyerest:skip', kind: 'send' },
  postpone: { channel: 'eyerest:postpone', kind: 'send' },
  snapshot: { channel: 'eyerest:snapshot', kind: 'push' },
} as const satisfies Record<string, { channel: string; kind: IpcKind }>;

export type IpcName = keyof typeof IPC;

/** All channel names of a given kind. */
export function channelsOfKind(kind: IpcKind): string[] {
  return Object.values(IPC)
    .filter((entry) => entry.kind === kind)
    .map((entry) => entry.channel);
}

/**
 * Answer to `saveSettings`. `error` is a message safe to show the user; main
 * logs the technical detail. On success `settings` is what is now persisted.
 */
export type SaveSettingsResult =
  | { readonly ok: true; readonly settings: RestConfig }
  | { readonly ok: false; readonly error: string };

/**
 * The only surface the renderer gets from the main process.
 * Exposed on `window.eyerest` by the preload script.
 */
export interface EyerestApi {
  /** Current scheduler snapshot. */
  getSnapshot(): Promise<Snapshot>;
  /** The configured settings: defaults with the user's saved changes. */
  getSettings(): Promise<RestConfig>;
  /**
   * Validates, saves and applies settings. Main re-validates every field, so a
   * rejected save resolves with `ok: false` instead of throwing.
   */
  saveSettings(settings: RestConfig): Promise<SaveSettingsResult>;
  /** Subscribes to snapshot pushes. Returns an unsubscribe function. */
  onSnapshot(listener: (snapshot: Snapshot) => void): () => void;
  /** User pressed Skip. */
  skip(): void;
  /** User pressed Postpone. */
  postpone(): void;
}

/** Minimal shape of Electron's `ipcMain` that we depend on (lets us fake it in tests). */
export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
  on(channel: string, listener: () => void): void;
  removeHandler(channel: string): void;
  removeListener(channel: string, listener: () => void): void;
}

/** Minimal shape of Electron's `ipcRenderer` that we depend on. */
export interface IpcRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  send(channel: string, ...args: unknown[]): void;
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
}
