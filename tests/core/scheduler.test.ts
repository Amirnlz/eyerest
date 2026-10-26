import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfig } from '../../src/core/config';
import {
  RestScheduler,
  type Clock,
  type Snapshot,
  type Ticker,
} from '../../src/core/scheduler';
import type { EngineEvent } from '../../src/core/state';

const MIN = 60_000;
const SEC = 1_000;

/** Manual clock + ticker: tests advance time explicitly, no real timers. */
class FakeTime implements Clock, Ticker {
  private current = 0;
  private callback: (() => void) | null = null;
  private interval = 0;
  activeTickers = 0;

  now(): number {
    return this.current;
  }

  start(callback: () => void, intervalMs: number): () => void {
    this.callback = callback;
    this.interval = intervalMs;
    this.activeTickers++;
    return () => {
      this.callback = null;
      this.activeTickers--;
    };
  }

  /** Advances time in ticker-sized steps, firing the callback each step. */
  advance(ms: number): void {
    const steps = Math.ceil(ms / (this.interval || ms));
    const step = this.interval || ms;
    for (let i = 0; i < steps; i++) {
      this.current += Math.min(step, ms - i * step);
      this.callback?.();
    }
  }
}

function setup() {
  const time = new FakeTime();
  const scheduler = new RestScheduler(createConfig(), {
    clock: time,
    ticker: time,
    tickIntervalMs: 250,
  });
  const snapshots: Snapshot[] = [];
  const events: EngineEvent[] = [];
  scheduler.subscribe((snapshot, emitted) => {
    snapshots.push(snapshot);
    events.push(...emitted);
  });
  return { time, scheduler, snapshots, events };
}

describe('RestScheduler', () => {
  it('starts idle', () => {
    const { scheduler } = setup();
    expect(scheduler.getSnapshot()).toEqual({
      state: { phase: 'idle' },
      secondsRemaining: null,
    });
  });

  it('emits started and begins ticking on start()', () => {
    const { scheduler, events, time } = setup();
    scheduler.start();
    expect(events).toEqual([{ type: 'started' }]);
    expect(time.activeTickers).toBe(1);
  });

  it('start() twice does not create a second ticker or event', () => {
    const { scheduler, events, time } = setup();
    scheduler.start();
    scheduler.start();
    expect(events).toHaveLength(1);
    expect(time.activeTickers).toBe(1);
  });

  it('runs the full flow: warning, then rest, then back to work', () => {
    const { scheduler, events, time } = setup();
    scheduler.start();
    time.advance(20 * MIN);
    time.advance(20 * SEC);

    expect(events.map((e) => e.type)).toEqual([
      'started',
      'warning-started',
      'rest-started',
      'rest-completed',
    ]);
    expect(scheduler.getSnapshot().state.phase).toBe('working');
  });

  it('emits one update per whole second while the warning counts down', () => {
    const { scheduler, snapshots, time } = setup();
    scheduler.start();
    time.advance(20 * MIN - 15 * SEC);
    // The warning-started emission already reported 15 seconds.
    expect(snapshots.at(-1)?.secondsRemaining).toBe(15);
    snapshots.length = 0;

    time.advance(5 * SEC);
    const seconds = snapshots.map((s) => s.secondsRemaining);
    expect(seconds).toEqual([14, 13, 12, 11, 10]);
  });

  it('emits no updates while simply working', () => {
    const { scheduler, snapshots, time } = setup();
    scheduler.start();
    snapshots.length = 0;
    time.advance(10 * MIN);
    expect(snapshots).toHaveLength(0);
  });

  it('counts down the rest from 20 seconds', () => {
    const { scheduler, snapshots, time } = setup();
    scheduler.start();
    time.advance(20 * MIN);
    expect(scheduler.getSnapshot().secondsRemaining).toBe(20);
    time.advance(7 * SEC);
    expect(scheduler.getSnapshot().secondsRemaining).toBe(13);
    expect(snapshots.at(-1)?.state.phase).toBe('resting');
  });

  it('skip() ends the rest and schedules the next in 20 minutes', () => {
    const { scheduler, events, time } = setup();
    scheduler.start();
    time.advance(20 * MIN);
    scheduler.skip();

    expect(events.at(-1)).toEqual({ type: 'rest-skipped', kind: 'eye' });
    const { state } = scheduler.getSnapshot();
    expect(state).toEqual({ phase: 'working', restAt: 40 * MIN, restsDone: 1 });
  });

  it('postpone() delays the rest by 5 minutes', () => {
    const { scheduler, events, time } = setup();
    scheduler.start();
    time.advance(20 * MIN);
    scheduler.postpone();

    expect(events.at(-1)).toEqual({ type: 'rest-postponed', newRestAt: 25 * MIN });
    time.advance(5 * MIN);
    expect(scheduler.getSnapshot().state.phase).toBe('resting');
  });

  it('stop() returns to idle, releases the ticker and stops events', () => {
    const { scheduler, events, time } = setup();
    scheduler.start();
    scheduler.stop();
    const before = events.length;

    time.advance(30 * MIN);
    expect(scheduler.getSnapshot().state.phase).toBe('idle');
    expect(time.activeTickers).toBe(0);
    expect(events.at(-1)).toEqual({ type: 'stopped' });
    expect(events).toHaveLength(before);
  });

  it('can start again after stop', () => {
    const { scheduler, time } = setup();
    scheduler.start();
    scheduler.stop();
    scheduler.start();
    expect(time.activeTickers).toBe(1);
    expect(scheduler.getSnapshot().state.phase).toBe('working');
  });

  it('offers the long rest on the third cycle', () => {
    const { scheduler, events, time } = setup();
    scheduler.start();
    for (let i = 0; i < 2; i++) {
      time.advance(20 * MIN);
      time.advance(20 * SEC);
    }
    time.advance(20 * MIN);

    const starts = events.filter((e) => e.type === 'rest-started');
    expect(starts.map((e) => (e as { kind: string }).kind)).toEqual(['eye', 'eye', 'long']);
    expect(scheduler.getSnapshot().secondsRemaining).toBe(10 * 60);
  });

  it('unsubscribe stops notifications for that listener only', () => {
    const { scheduler, time } = setup();
    const a = vi.fn();
    const b = vi.fn();
    const offA = scheduler.subscribe(a);
    scheduler.subscribe(b);
    offA();

    scheduler.start();
    time.advance(20 * MIN);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it('dispose() releases the ticker and drops listeners', () => {
    const { scheduler, events, time } = setup();
    scheduler.start();
    scheduler.dispose();
    const before = events.length;
    time.advance(30 * MIN);
    expect(time.activeTickers).toBe(0);
    expect(events).toHaveLength(before);
  });

  it('a throwing listener does not prevent other listeners from running', () => {
    const time = new FakeTime();
    const onListenerError = vi.fn();
    const scheduler = new RestScheduler(createConfig(), {
      clock: time,
      ticker: time,
      onListenerError,
    });
    const good = vi.fn();
    scheduler.subscribe(() => {
      throw new Error('boom');
    });
    scheduler.subscribe(good);

    expect(() => scheduler.start()).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    expect(onListenerError).toHaveBeenCalledTimes(1);
  });
});

describe('RestScheduler with real timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('works with the default system clock and ticker', () => {
    const scheduler = new RestScheduler(createConfig());
    const types: string[] = [];
    scheduler.subscribe((_s, events) => types.push(...events.map((e) => e.type)));

    scheduler.start();
    vi.advanceTimersByTime(20 * MIN);
    expect(types).toEqual(['started', 'warning-started', 'rest-started']);

    scheduler.dispose();
  });
});
