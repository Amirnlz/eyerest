import { describe, expect, it, vi } from 'vitest';
import { createIdleConfig } from '../../src/core/idle';
import type { Snapshot } from '../../src/core/scheduler';
import { IdleMonitor, type IdleSchedulerPort } from '../../src/main/idle/idle-monitor';
import type { IdleSource } from '../../src/main/idle/ports';
import { AWAY, IDLE, WORKING, resting, warning } from '../helpers/fake-api';
import { FakeTime } from '../helpers/fake-time';

class FakeScheduler implements IdleSchedulerPort {
  snapshot: Snapshot = WORKING;
  readonly calls: string[] = [];
  getSnapshot() {
    return this.snapshot;
  }
  away(sinceMs: number) {
    this.calls.push(`away:${sinceMs}`);
  }
  back() {
    this.calls.push('back');
  }
}

function setup(idleMs: number | Error = 0) {
  let reading: number | Error = idleMs;
  const source: IdleSource = {
    getIdleMs: () => {
      if (reading instanceof Error) throw reading;
      return reading;
    },
  };
  const scheduler = new FakeScheduler();
  const clock = new FakeTime();
  const ticker = new FakeTime();
  const log = vi.fn<(message: string) => void>();
  const monitor = new IdleMonitor(source, scheduler, clock, ticker, {
    config: createIdleConfig({ thresholdMs: 60_000 }),
    log,
  });
  return {
    monitor,
    scheduler,
    clock,
    ticker,
    log,
    setReading: (value: number | Error) => {
      reading = value;
    },
  };
}

describe('IdleMonitor', () => {
  it('does nothing while the person is active', () => {
    const { monitor, scheduler } = setup(5_000);
    monitor.poll();
    expect(scheduler.calls).toEqual([]);
  });

  it('goes away when idle reaches the threshold, passing the time of the last input', () => {
    const { monitor, scheduler, clock } = setup(75_000);
    clock.advance(200_000);
    monitor.poll();
    expect(scheduler.calls).toEqual(['away:125000']);
  });

  it('comes back when activity returns while away', () => {
    const { monitor, scheduler } = setup(100);
    scheduler.snapshot = AWAY;
    monitor.poll();
    expect(scheduler.calls).toEqual(['back']);
  });

  it('stays away while idle time is still over the threshold', () => {
    const { monitor, scheduler } = setup(120_000);
    scheduler.snapshot = AWAY;
    monitor.poll();
    expect(scheduler.calls).toEqual([]);
  });

  it.each([
    ['idle', IDLE],
    ['warning', warning(10)],
    ['resting', resting(10)],
  ])('never acts during %s, even at a huge idle time', (_name, snapshot) => {
    const { monitor, scheduler } = setup(10 * 60_000);
    scheduler.snapshot = snapshot;
    monitor.poll();
    expect(scheduler.calls).toEqual([]);
  });

  it('logs and skips a failing source, then recovers', () => {
    const { monitor, scheduler, log, setReading } = setup(new Error('no x11'));
    monitor.poll();
    expect(scheduler.calls).toEqual([]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('no x11'));

    setReading(61_000);
    monitor.poll();
    expect(scheduler.calls).toHaveLength(1);
  });

  it('ignores an unusable reading', () => {
    const { monitor, scheduler } = setup(Number.NaN);
    monitor.poll();
    expect(scheduler.calls).toEqual([]);
  });

  it('polls once per second from start() and stops on dispose()', () => {
    const { monitor, scheduler, ticker, setReading } = setup(0);
    monitor.start();
    monitor.start();
    expect(ticker.activeTickers).toBe(1);

    setReading(61_000);
    ticker.advance(1_000);
    expect(scheduler.calls).toHaveLength(1);

    monitor.dispose();
    expect(ticker.activeTickers).toBe(0);
    ticker.advance(1_000);
    expect(scheduler.calls).toHaveLength(1);
  });

  it('honours a custom poll interval', () => {
    const scheduler = new FakeScheduler();
    const ticker = new FakeTime();
    const monitor = new IdleMonitor({ getIdleMs: () => 61_000 }, scheduler, new FakeTime(), ticker, {
      config: createIdleConfig(),
      pollIntervalMs: 250,
    });
    monitor.start();
    ticker.advance(1_000);
    expect(scheduler.calls).toHaveLength(4);
  });
});
