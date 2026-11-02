import type { RestConfig } from '../core/config';
import { createIdleConfig, type IdleConfig } from '../core/idle';
import { DEFAULT_SCHEDULE } from '../core/schedule';
import {
  RestScheduler,
  systemClock,
  systemTicker,
  type SchedulerOptions,
  type Ticker,
} from '../core/scheduler';
import type { IpcMainLike } from '../shared/ipc';
import { IdleMonitor } from './idle/idle-monitor';
import type { IdleSource } from './idle/ports';
import { registerIpcHandlers } from './ipc-handlers';
import { resolveConfig } from './runtime-config';
import type { SchedulePrefsPort } from './schedule/ports';
import { ScheduleGate } from './schedule/schedule-gate';
import { ScheduleService } from './schedule/schedule-service';
import { SettingsService, type SettingsStorage } from './settings/settings-service';
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
  /** Persists saved settings. Without it, `saveSettings` answers `ok: false`. */
  readonly settingsStorage?: SettingsStorage;
  /** Closes the settings window when the renderer asks. Absent in tests that have no window. */
  readonly closeSettingsWindow?: () => void;
  /**
   * Idle detection. Without a source there is no monitor, so tests that do not care
   * about it are unchanged. `EYEREST_FAST=1` shortens the threshold to 3 s and
   * `EYEREST_IDLE=0` turns the monitor off (the e2e suite sends no input, so it would
   * otherwise go away mid-cycle).
   */
  readonly idle?: {
    readonly source: IdleSource;
    readonly config?: Partial<IdleConfig>;
    /** Test seam. The scheduler's ticker is not reused: a fake ticker holds one callback. */
    readonly ticker?: Ticker;
    readonly log?: (message: string) => void;
  };
  /**
   * Working hours. Without it there is no gate and the schedule cannot be saved, so tests that do
   * not care about it are unchanged. The gate has its own ticker seam for the same reason as idle.
   */
  readonly schedule?: {
    readonly prefs: SchedulePrefsPort;
    readonly ticker?: Ticker;
    readonly log?: (message: string) => void;
  };
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
  const idleMonitor =
    deps.idle === undefined || deps.env['EYEREST_IDLE'] === '0'
      ? null
      : new IdleMonitor(
        deps.idle.source,
        scheduler,
        deps.schedulerOptions?.clock ?? systemClock,
        deps.idle.ticker ?? systemTicker,
        {
          config: createIdleConfig({
            ...(deps.env['EYEREST_FAST'] === '1' ? { thresholdMs: 3_000 } : {}),
            ...deps.idle.config,
          }),
          log: deps.idle.log,
        },
      );
  const scheduleGate =
    deps.schedule === undefined
      ? null
      : new ScheduleGate(
        () => deps.schedule?.prefs.get() ?? DEFAULT_SCHEDULE,
        {
          isRunning: () => controller.getSnapshot().state.phase !== 'idle',
          pause: () => controller.pause(),
          resume: () => controller.resume(),
        },
        deps.schedulerOptions?.clock ?? systemClock,
        deps.schedule.ticker ?? systemTicker,
        { log: deps.schedule.log },
      );
  const scheduleService =
    deps.schedule === undefined
      ? null
      : new ScheduleService(deps.schedule.prefs, () => scheduleGate?.evaluate());
  const settings = new SettingsService({
    env: deps.env,
    initialOverrides: deps.settingsOverrides,
    storage: deps.settingsStorage,
    onApply: (next) => controller.reconfigure(next),
  });
  const removeIpcHandlers = registerIpcHandlers(deps.ipcMain, controller, {
    getSettings: () => settings.getSettings(),
    saveSettings: (payload) => settings.saveSettings(payload),
    closeSettings: () => deps.closeSettingsWindow?.(),
    getSchedule: () => scheduleService?.get() ?? DEFAULT_SCHEDULE,
    saveSchedule: (payload) =>
      scheduleService?.save(payload) ?? {
        ok: false,
        error: 'Working hours storage is unavailable.',
      },
  });

  return {
    controller,
    start: () => {
      controller.start();
      idleMonitor?.start();
      scheduleGate?.start();
    },
    dispose: () => {
      idleMonitor?.dispose();
      scheduleGate?.dispose();
      removeIpcHandlers();
      controller.dispose();
    },
  };
}
