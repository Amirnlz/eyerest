import type { RestConfig } from './config';
import { transition } from './engine';
import {
  IDLE_STATE,
  remainingMs,
  type EngineAction,
  type EngineEvent,
  type EngineState,
} from './state';

/** Ports: injected so the scheduler never touches real time directly. */
export interface Clock {
  now(): number;
}

export interface Ticker {
  start(callback: () => void, intervalMs: number): () => void;
}

export const systemClock: Clock = { now: () => Date.now() };

export const systemTicker: Ticker = {
  start(callback, intervalMs) {
    const handle = setInterval(callback, intervalMs);
    return () => clearInterval(handle);
  },
};

export interface Snapshot {
  readonly state: EngineState;
  /** Whole seconds left in the visible countdown, or null when none is shown. */
  readonly secondsRemaining: number | null;
}

export type Listener = (snapshot: Snapshot, events: readonly EngineEvent[]) => void;

export interface SchedulerOptions {
  readonly clock?: Clock;
  readonly ticker?: Ticker;
  /** How often the engine is polled. Lower = more precise transitions. */
  readonly tickIntervalMs?: number;
  /** Called when a listener throws. One bad listener never blocks the others. */
  readonly onListenerError?: (error: unknown) => void;
}

/**
 * Drives the pure engine with a clock and a ticker, and notifies subscribers.
 *
 * Listeners are called when:
 * - the engine emitted events (a phase change or user action), or
 * - the visible countdown (warning/resting) changed by a whole second.
 *
 * Future adapters (overlay window, screen dimming, media pausing) subscribe
 * here and react to events; none of them live in the scheduler itself.
 */
export class RestScheduler {
  private readonly clock: Clock;
  private readonly ticker: Ticker;
  private readonly tickIntervalMs: number;
  private readonly onListenerError: (error: unknown) => void;
  private readonly listeners = new Set<Listener>();

  private state: EngineState = IDLE_STATE;
  private stopTicker: (() => void) | null = null;
  private lastEmittedSeconds: number | null = null;

  constructor(
    private readonly config: RestConfig,
    options: SchedulerOptions = {},
  ) {
    this.clock = options.clock ?? systemClock;
    this.ticker = options.ticker ?? systemTicker;
    this.tickIntervalMs = options.tickIntervalMs ?? 250;
    this.onListenerError =
      options.onListenerError ?? ((error) => console.error('[RestScheduler] listener failed', error));
  }

  getSnapshot(): Snapshot {
    return this.snapshot();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  start(): void {
    this.dispatch({ type: 'start', now: this.clock.now() });
    if (this.state.phase !== 'idle' && this.stopTicker === null) {
      this.stopTicker = this.ticker.start(() => this.tick(), this.tickIntervalMs);
    }
  }

  stop(): void {
    this.dispatch({ type: 'stop' });
    this.releaseTicker();
  }

  skip(): void {
    this.dispatch({ type: 'skip', now: this.clock.now() });
  }

  postpone(): void {
    this.dispatch({ type: 'postpone', now: this.clock.now() });
  }

  /** Stops timers and drops listeners. The instance must not be reused. */
  dispose(): void {
    this.releaseTicker();
    this.listeners.clear();
    this.state = IDLE_STATE;
  }

  private tick(): void {
    this.dispatch({ type: 'tick', now: this.clock.now() });
  }

  private dispatch(action: EngineAction): void {
    const result = transition(this.state, action, this.config);
    this.state = result.state;

    const snapshot = this.snapshot();
    const seconds = snapshot.secondsRemaining;
    const countdownChanged = seconds !== null && seconds !== this.lastEmittedSeconds;

    if (result.events.length === 0 && !countdownChanged) return;

    this.lastEmittedSeconds = seconds;
    for (const listener of [...this.listeners]) {
      try {
        listener(snapshot, result.events);
      } catch (error) {
        this.onListenerError(error);
      }
    }
  }

  private snapshot(): Snapshot {
    const remaining = remainingMs(this.state, this.clock.now());
    return {
      state: this.state,
      secondsRemaining: remaining === null ? null : Math.ceil(remaining / 1000),
    };
  }

  private releaseTicker(): void {
    this.stopTicker?.();
    this.stopTicker = null;
    this.lastEmittedSeconds = null;
  }
}
