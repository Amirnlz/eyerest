import { decideIdle, type IdleConfig } from '../../core/idle';
import type { Clock, Snapshot, Ticker } from '../../core/scheduler';
import type { IdleSource } from './ports';

/** The part of `RestScheduler` the monitor uses. Lets tests inject a fake. */
export interface IdleSchedulerPort {
  getSnapshot(): Snapshot;
  away(sinceMs: number): void;
  back(): void;
}

export interface IdleMonitorOptions {
  readonly config: IdleConfig;
  /** How often the OS is asked. One second is plenty: the threshold is a minute. */
  readonly pollIntervalMs?: number;
  readonly log?: (message: string) => void;
}

/**
 * Adapter: polls the OS idle time and forwards the pure policy's decision to the
 * scheduler. Holds no rules of its own (`decideIdle` and the engine own them), so a
 * failing source is logged and skipped and never touches the timer.
 */
export class IdleMonitor {
  private stopTicker: (() => void) | null = null;

  constructor(
    private readonly source: IdleSource,
    private readonly scheduler: IdleSchedulerPort,
    private readonly clock: Clock,
    private readonly ticker: Ticker,
    private readonly options: IdleMonitorOptions,
  ) {}

  start(): void {
    if (this.stopTicker !== null) return;
    this.stopTicker = this.ticker.start(() => this.poll(), this.options.pollIntervalMs ?? 1_000);
  }

  /** One reading. Public so tests need no ticker. */
  poll(): void {
    let idleMs: number;
    try {
      idleMs = this.source.getIdleMs();
    } catch (error) {
      this.options.log?.(`idle source failed: ${String(error)}`);
      return;
    }

    const decision = decideIdle({
      phase: this.scheduler.getSnapshot().state.phase,
      idleMs,
      thresholdMs: this.options.config.thresholdMs,
    });
    if (decision === 'away') {
      this.options.log?.(`away after ${idleMs} ms idle`);
      this.scheduler.away(this.clock.now() - idleMs);
    } else if (decision === 'back') {
      this.options.log?.('back');
      this.scheduler.back();
    }
  }

  dispose(): void {
    this.stopTicker?.();
    this.stopTicker = null;
  }
}
