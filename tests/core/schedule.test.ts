import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCHEDULE,
  isWithinSchedule,
  sameSchedule,
  validateSchedule,
  type WorkSchedule,
} from '../../src/core/schedule';

/** A local-time timestamp, so the tests give the same answer in every time zone. */
function at(year: number, month: number, day: number, hour: number, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

// 2026-11-02 is a Monday.
const MONDAY = (hour: number, minute = 0) => at(2026, 11, 2, hour, minute);
const SATURDAY = (hour: number, minute = 0) => at(2026, 11, 7, hour, minute);
const SUNDAY = (hour: number, minute = 0) => at(2026, 11, 8, hour, minute);

const office: WorkSchedule = {
  enabled: true,
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 17 * 60,
};

describe('isWithinSchedule', () => {
  it('is always true while disabled, whatever the day and time', () => {
    const off = { ...office, enabled: false };
    expect(isWithinSchedule(off, SATURDAY(3))).toBe(true);
    expect(isWithinSchedule(DEFAULT_SCHEDULE, SUNDAY(23, 59))).toBe(true);
  });

  it('includes the start minute and excludes the end minute', () => {
    expect(isWithinSchedule(office, MONDAY(8, 59))).toBe(false);
    expect(isWithinSchedule(office, MONDAY(9, 0))).toBe(true);
    expect(isWithinSchedule(office, MONDAY(16, 59))).toBe(true);
    expect(isWithinSchedule(office, MONDAY(17, 0))).toBe(false);
  });

  it('is false on a day that is not listed, even at an active time', () => {
    expect(isWithinSchedule(office, SATURDAY(12))).toBe(false);
    expect(isWithinSchedule(office, SUNDAY(12))).toBe(false);
  });

  it('reads Sunday as day 0 and Saturday as day 6', () => {
    const weekend = { ...office, days: [0, 6] as const };
    expect(isWithinSchedule(weekend, SUNDAY(10))).toBe(true);
    expect(isWithinSchedule(weekend, SATURDAY(10))).toBe(true);
    expect(isWithinSchedule(weekend, MONDAY(10))).toBe(false);
  });

  it('runs to the end of the day with an end of 1440', () => {
    const late = { ...office, startMinute: 20 * 60, endMinute: 1440 };
    expect(isWithinSchedule(late, MONDAY(23, 59))).toBe(true);
    // The next day is Tuesday, which is listed, but 00:00 is before the 20:00 start.
    expect(isWithinSchedule(late, at(2026, 11, 3, 0, 0))).toBe(false);
  });

  it('follows the local clock, so a clock change moves the answer on the next check', () => {
    expect(isWithinSchedule(office, MONDAY(8, 30))).toBe(false);
    expect(isWithinSchedule(office, MONDAY(9, 30))).toBe(true);
  });
});

describe('validateSchedule', () => {
  const valid = { enabled: true, days: [5, 1, 1, 3], startMinute: 480, endMinute: 1020 };

  it('accepts a valid schedule and returns it sorted without duplicates', () => {
    expect(validateSchedule(valid)).toEqual({
      ok: true,
      schedule: { enabled: true, days: [1, 3, 5], startMinute: 480, endMinute: 1020 },
    });
  });

  it('accepts the default schedule and the full-day bounds', () => {
    expect(validateSchedule(DEFAULT_SCHEDULE).ok).toBe(true);
    expect(validateSchedule({ ...valid, startMinute: 0, endMinute: 1440 }).ok).toBe(true);
    expect(validateSchedule({ ...valid, startMinute: 1439, endMinute: 1440 }).ok).toBe(true);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'x'],
    ['a missing key', { enabled: true, days: [1], startMinute: 0 }],
    ['an unknown key', { ...valid, extra: 1 }],
    ['a non-boolean enabled', { ...valid, enabled: 'yes' }],
    ['days that are not an array', { ...valid, days: '12345' }],
    ['no days', { ...valid, days: [] }],
    ['a day above 6', { ...valid, days: [7] }],
    ['a negative day', { ...valid, days: [-1] }],
    ['a fractional day', { ...valid, days: [1.5] }],
    ['a string day', { ...valid, days: ['1'] }],
    ['a start below 0', { ...valid, startMinute: -1 }],
    ['a start of 1440', { ...valid, startMinute: 1440, endMinute: 1440 }],
    ['an end of 0', { ...valid, startMinute: 0, endMinute: 0 }],
    ['an end above 1440', { ...valid, endMinute: 1441 }],
    ['a fractional start', { ...valid, startMinute: 480.5 }],
    ['a NaN end', { ...valid, endMinute: Number.NaN }],
    ['a string start', { ...valid, startMinute: '480' }],
    ['an end equal to the start', { ...valid, startMinute: 600, endMinute: 600 }],
    ['an end before the start (no overnight windows)', { ...valid, startMinute: 1320, endMinute: 360 }],
  ])('rejects %s with a message', (_name, value) => {
    const result = validateSchedule(value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it('does not mutate its input', () => {
    const input = { ...valid, days: [5, 1] };
    validateSchedule(input);
    expect(input.days).toEqual([5, 1]);
  });
});

describe('sameSchedule', () => {
  it('compares by value', () => {
    expect(sameSchedule(office, { ...office, days: [1, 2, 3, 4, 5] })).toBe(true);
  });

  it.each<[string, WorkSchedule]>([
    ['enabled', { ...office, enabled: false }],
    ['days', { ...office, days: [1, 2, 3, 4] }],
    ['a different day', { ...office, days: [1, 2, 3, 4, 6] }],
    ['start', { ...office, startMinute: 541 }],
    ['end', { ...office, endMinute: 1021 }],
  ])('differs by %s', (_name, other) => {
    expect(sameSchedule(office, other)).toBe(false);
  });
});
