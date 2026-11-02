import { outcomeForEvent, type StatOutcome } from '../../core/stats';
import type { Clock, Snapshot } from '../../core/scheduler';
import type { EngineEvent } from '../../core/state';
import type { SnapshotSender } from '../scheduler-controller';

/** Where an outcome is counted. In the app: `StatsStore`. */
export interface StatsSink {
  record(outcome: StatOutcome, now: number): void;
}

/**
 * Adapter on the scheduler's event stream: counts every rest outcome on the day it happened. It
 * decides nothing itself (`outcomeForEvent` owns the mapping) and is a side-effect subscriber like
 * the sound cues, so the core stays free of it.
 */
export class StatsRecorder implements SnapshotSender {
  constructor(
    private readonly sink: StatsSink,
    private readonly clock: Clock,
  ) {}

  send(_snapshot: Snapshot, events: readonly EngineEvent[] = []): void {
    for (const event of events) {
      const outcome = outcomeForEvent(event);
      if (outcome !== null) this.sink.record(outcome, this.clock.now());
    }
  }
}
