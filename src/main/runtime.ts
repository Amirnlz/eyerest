import type { RestConfig } from '../core/config';
import { RestScheduler, type SchedulerOptions } from '../core/scheduler';
import type { IpcMainLike } from '../shared/ipc';
import { registerIpcHandlers } from './ipc-handlers';
import { resolveConfig } from './runtime-config';
import {
  SchedulerController,
  type SnapshotSender,
} from './scheduler-controller';
import {
  createBroadcastSender,
  createCompositeSender,
  type WebContentsLike,
} from './snapshot-sender';

export interface MainRuntimeDeps {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly ipcMain: IpcMainLike;
  readonly getTargets: () => readonly WebContentsLike[];
  /**
   * Extra consumers of every snapshot, such as the overlay window manager.
   * They run after the renderer broadcast, and a failing one never blocks
   * the others.
   */
  readonly extraSenders?: readonly SnapshotSender[];
  /** Validated overrides from the settings file. `EYEREST_FAST=1` still wins. */
  readonly settingsOverrides?: Partial<RestConfig>;
  /** Test seam: inject a fake clock and ticker. */
  readonly schedulerOptions?: SchedulerOptions;
}

export interface MainRuntime {
  readonly controller: SchedulerController;
  start(): void;
  dispose(): void;
}

/**
 * Composition root for everything on the main side that does not need a real
 * Electron window: config, scheduler, controller, IPC handlers, snapshot
 * consumers. Keeping it free of Electron imports makes the whole main-side
 * flow testable.
 */
export function createMainRuntime(deps: MainRuntimeDeps): MainRuntime {
  const config = resolveConfig(deps.env, deps.settingsOverrides);
  const scheduler = new RestScheduler(config, deps.schedulerOptions);
  const sender = createCompositeSender([
    createBroadcastSender(deps.getTargets),
    ...(deps.extraSenders ?? []),
  ]);
  const controller = new SchedulerController(scheduler, sender);
  const removeIpcHandlers = registerIpcHandlers(deps.ipcMain, controller);

  return {
    controller,
    start: () => controller.start(),
    dispose: () => {
      removeIpcHandlers();
      controller.dispose();
    },
  };
}
