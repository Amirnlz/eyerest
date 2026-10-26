import { RestScheduler, type SchedulerOptions } from '../core/scheduler';
import type { IpcMainLike } from '../shared/ipc';
import { registerIpcHandlers } from './ipc-handlers';
import { resolveConfig } from './runtime-config';
import { SchedulerController } from './scheduler-controller';
import { createBroadcastSender, type WebContentsLike } from './snapshot-sender';

export interface MainRuntimeDeps {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly ipcMain: IpcMainLike;
  readonly getTargets: () => readonly WebContentsLike[];
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
 * Electron window: config, scheduler, controller, IPC handlers. Keeping it
 * free of Electron imports makes the whole main-side flow testable.
 */
export function createMainRuntime(deps: MainRuntimeDeps): MainRuntime {
  const config = resolveConfig(deps.env);
  const scheduler = new RestScheduler(config, deps.schedulerOptions);
  const controller = new SchedulerController(scheduler, createBroadcastSender(deps.getTargets));
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
