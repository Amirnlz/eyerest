import { isWithinSchedule, type WorkSchedule } from '../../core/schedule';
import type { Clock, Ticker } from '../../core/scheduler';
import type { ScheduleTarget } from './ports';

export interface ScheduleGateOptions {
  /** How often the clock is checked. Whole minutes are the finest edge, so half a minute is plenty. */
  readonly pollIntervalMs?: number;
  readonly log?: (message: string) => void;
}

export const DEFAULT_SCHEDULE_POLL_MS = 30_000;

/**
 * Adapter: pauses the scheduler when working hours end and resumes it when they start. It holds no
 * rules of its own (`isWithinSchedule` owns the window) and only reacts to the edges between
 * "inside" and "outside".
 *
 * - Leaving the window stops the scheduler, so no warning, rest, sound or overlay can appear.
 * - Entering it resumes only what the gate itself stopped, so a Pause chosen by the person stays
 *   paused. Resuming starts a fresh work interval, as the tray's Resume does.
 * - A person who presses Resume outside the window keeps reminders running until the next edge.
 * - Polling reads the clock each time, so sleep, wake and clock changes are picked up within one
 *   interval.
 */
export class ScheduleGate {
  private stopTicker: (() => void) | null = null;
  /** The last answer, or null before the first check. Only a change of answer is an edge. */
  private inside: boolean | null = null;
  /** True while the gate is the reason the scheduler is stopped. */
  private holding = false;

  constructor(
    private readonly schedule: () => WorkSchedule,
    private readonly target: ScheduleTarget,
    private readonly clock: Clock,
    private readonly ticker: Ticker,
    private readonly options: ScheduleGateOptions = {},
  ) {}

  start(): void {
    if (this.stopTicker !== null) return;
    this.evaluate();
    this.stopTicker = this.ticker.start(
      () => this.evaluate(),
      this.options.pollIntervalMs ?? DEFAULT_SCHEDULE_POLL_MS,
    );
  }

  /** One check. Public so a saved schedule applies at once and tests need no ticker. */
  evaluate(): void {
    const inside = isWithinSchedule(this.schedule(), this.clock.now());
    const previous = this.inside;
    this.inside = inside;
    if (inside === previous) return;

    if (!inside) {
      if (!this.target.isRunning()) return;
      this.holding = true;
      this.options.log?.('outside working hours: paused');
      this.target.pause();
      return;
    }

    if (!this.holding) return;
    this.holding = false;
    // The person may have resumed by hand while outside the window: then nothing is left to resume.
    if (this.target.isRunning()) return;
    this.options.log?.('working hours started: resumed');
    this.target.resume();
  }

  dispose(): void {
    this.stopTicker?.();
    this.stopTicker = null;
  }
}
