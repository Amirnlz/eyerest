import { describe, expect, it, vi } from 'vitest';
import type { WorkSchedule } from '../../src/core/schedule';
import { ScheduleGate } from '../../src/main/schedule/schedule-gate';
import { FakeTime } from '../helpers/fake-time';

function at(day: number, hour: number, minute = 0): number {
  // 2026-11-01 is a Sunday: offset 0 is Sunday, 1 is Monday, 5 is Friday, 6 is Saturday, 7 is Sunday.
  return new Date(2026, 10, 1 + day, hour, minute).getTime();
}

const office: WorkSchedule = {
  enabled: true,
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 17 * 60,
};

const MINUTE = 60_000;

function setup(options: { schedule?: WorkSchedule; start?: number; running?: boolean } = {}) {
  const ticker = new FakeTime();
  let schedule = options.schedule ?? office;
  let running = options.running ?? true;
  let nowMs = options.start ?? at(1, 10);
  const clock = { now: () => nowMs };

  const target = {
    isRunning: vi.fn(() => running),
    pause: vi.fn(() => {
      running = false;
    }),
    resume: vi.fn(() => {
      running = true;
    }),
  };
  const gate = new ScheduleGate(() => schedule, target, clock, ticker, { pollIntervalMs: MINUTE });

  return {
    gate,
    target,
    ticker,
    start: () => gate.start(),
    setNow: (value: number) => {
      nowMs = value;
    },
    setSchedule: (value: WorkSchedule) => {
      schedule = value;
    },
    /** The person presses Pause or Resume in the tray: the scheduler changes without the gate. */
    setRunning: (value: boolean) => {
      running = value;
    },
    /** Moves the clock and lets the gate poll once. */
    moveTo: (value: number) => {
      nowMs = value;
      ticker.advance(MINUTE);
    },
  };
}

describe('ScheduleGate', () => {
  it('does nothing while the schedule is disabled', () => {
    const { start, target, moveTo } = setup({ schedule: { ...office, enabled: false } });
    start();
    moveTo(at(0, 3));
    expect(target.pause).not.toHaveBeenCalled();
    expect(target.resume).not.toHaveBeenCalled();
  });

  it('leaves a running scheduler alone while inside the window', () => {
    const { start, target } = setup();
    start();
    expect(target.pause).not.toHaveBeenCalled();
  });

  it('pauses at once on start when the app opens outside the window', () => {
    const { start, target } = setup({ start: at(1, 7) });
    start();
    expect(target.pause).toHaveBeenCalledTimes(1);
  });

  it('pauses when the window ends and resumes when the next one starts', () => {
    const { start, target, moveTo } = setup({ start: at(1, 16, 59) });
    start();
    moveTo(at(1, 17, 0));
    expect(target.pause).toHaveBeenCalledTimes(1);

    moveTo(at(2, 8, 59));
    expect(target.resume).not.toHaveBeenCalled();
    moveTo(at(2, 9, 0));
    expect(target.resume).toHaveBeenCalledTimes(1);
  });

  it('pauses and resumes only once per edge, not on every poll', () => {
    const { start, target, moveTo } = setup({ start: at(1, 16, 59) });
    start();
    moveTo(at(1, 17));
    moveTo(at(1, 18));
    moveTo(at(1, 19));
    expect(target.pause).toHaveBeenCalledTimes(1);
    moveTo(at(2, 9));
    moveTo(at(2, 10));
    expect(target.resume).toHaveBeenCalledTimes(1);
  });

  it('stays paused through an unlisted day and resumes on the next listed one', () => {
    const { start, target, moveTo } = setup({ start: at(5, 16, 59) });
    start();
    moveTo(at(5, 17));
    moveTo(at(6, 12));
    moveTo(at(7, 12));
    expect(target.resume).not.toHaveBeenCalled();
    moveTo(at(8, 9));
    expect(target.resume).toHaveBeenCalledTimes(1);
  });

  it('notices a late wake: the first poll after a long sleep applies the right side of the edge', () => {
    const { start, target, moveTo } = setup({ start: at(1, 12) });
    start();
    moveTo(at(1, 22));
    expect(target.pause).toHaveBeenCalledTimes(1);
    moveTo(at(2, 11));
    expect(target.resume).toHaveBeenCalledTimes(1);
  });

  it('does not resume a Pause the person chose inside the window', () => {
    const { start, target, moveTo, setRunning } = setup({ start: at(1, 10) });
    start();
    setRunning(false);
    moveTo(at(1, 17));
    moveTo(at(2, 9));
    expect(target.pause).not.toHaveBeenCalled();
    expect(target.resume).not.toHaveBeenCalled();
  });

  it('does not resume a scheduler the person had paused before the window ended', () => {
    const { start, target, moveTo } = setup({ start: at(1, 18), running: false });
    start();
    moveTo(at(1, 19));
    moveTo(at(2, 9));
    expect(target.pause).not.toHaveBeenCalled();
    expect(target.resume).not.toHaveBeenCalled();
  });

  it('keeps reminders running when the person pressed Resume outside the window, and does not restart them at the edge', () => {
    const { start, target, moveTo, setRunning } = setup({ start: at(1, 16, 59) });
    start();
    moveTo(at(1, 17));
    expect(target.pause).toHaveBeenCalledTimes(1);

    setRunning(true);
    moveTo(at(1, 20));
    expect(target.pause).toHaveBeenCalledTimes(1);

    moveTo(at(2, 9));
    expect(target.resume).not.toHaveBeenCalled();
  });

  it('applies a saved schedule at once through evaluate, without waiting for a poll', () => {
    const { start, target, gate, setSchedule } = setup({ start: at(1, 12) });
    start();
    setSchedule({ ...office, startMinute: 13 * 60 });
    gate.evaluate();
    expect(target.pause).toHaveBeenCalledTimes(1);

    setSchedule({ ...office, enabled: false });
    gate.evaluate();
    expect(target.resume).toHaveBeenCalledTimes(1);
  });

  it('starts one ticker, ignores a second start, and releases it on dispose', () => {
    const { start, gate, ticker } = setup();
    start();
    start();
    expect(ticker.activeTickers).toBe(1);
    gate.dispose();
    expect(ticker.activeTickers).toBe(0);
  });

  it('logs the edges when given a logger', () => {
    const log: string[] = [];
    const ticker = new FakeTime();
    let nowMs = at(1, 16, 59);
    let running = true;
    const gate = new ScheduleGate(
      () => office,
      {
        isRunning: () => running,
        pause: () => {
          running = false;
        },
        resume: () => {
          running = true;
        },
      },
      { now: () => nowMs },
      ticker,
      { pollIntervalMs: MINUTE, log: (message) => log.push(message) },
    );
    gate.start();
    nowMs = at(1, 17);
    ticker.advance(MINUTE);
    nowMs = at(2, 9);
    ticker.advance(MINUTE);
    expect(log).toEqual(['outside working hours: paused', 'working hours started: resumed']);
  });
});
