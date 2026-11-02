import type { WorkSchedule } from '../../core/schedule';

/** Where the working hours are kept. In the app: the schedule part of the preferences store. */
export interface SchedulePrefsPort {
  get(): WorkSchedule;
  set(next: WorkSchedule): void;
}

/** What the gate drives: the scheduler, as the controller exposes it. */
export interface ScheduleTarget {
  /** False while the scheduler is stopped, whether by the gate or by the Pause menu item. */
  isRunning(): boolean;
  pause(): void;
  resume(): void;
}
