import type { RestConfig } from '../core/config';
import type { Listener, Snapshot } from '../core/scheduler';

/** The part of `RestScheduler` the controller uses. Lets tests inject a fake. */
export interface SchedulerPort {
  start(): void;
  stop(): void;
  skip(): void;
  postpone(): void;
  reconfigure(config: RestConfig): void;
  getSnapshot(): Snapshot;
  subscribe(listener: Listener): () => void;
  dispose(): void;
}

/** Where snapshots go. In the app this broadcasts to renderer windows. */
export interface SnapshotSender {
  send(snapshot: Snapshot): void;
}

/**
 * Owns the scheduler on the main-process side: forwards every snapshot to the
 * sender and turns user intents into scheduler calls.
 */
export class SchedulerController {
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly scheduler: SchedulerPort,
    private readonly sender: SnapshotSender,
  ) {}

  /** Subscribes first, then starts, so the initial `started` update is not missed. */
  start(): void {
    if (this.unsubscribe !== null) return;
    this.unsubscribe = this.scheduler.subscribe((snapshot) => this.sender.send(snapshot));
    this.scheduler.start();
  }

  getSnapshot(): Snapshot {
    return this.scheduler.getSnapshot();
  }

  /**
   * Pauses reminders: the scheduler goes idle, and every adapter (overlay,
   * dim layer) sees an idle snapshot and hides at once.
   */
  pause(): void {
    this.scheduler.stop();
  }

  /** Resumes reminders with a fresh cycle: a full work interval from now. */
  resume(): void {
    this.scheduler.start();
  }

  skip(): void {
    this.scheduler.skip();
  }

  postpone(): void {
    this.scheduler.postpone();
  }

  /**
   * Applies a new config. A running cycle restarts with a full work interval
   * (see `RestScheduler.reconfigure`); a paused scheduler stays paused.
   */
  reconfigure(config: RestConfig): void {
    this.scheduler.reconfigure(config);
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.scheduler.dispose();
  }
}
