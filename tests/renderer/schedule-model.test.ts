import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE, WEEKDAYS, type WorkSchedule } from '../../src/core/schedule';
import { copy } from '../../src/renderer/copy';
import {
  DAY_DISPLAY_ORDER,
  minutesToTime,
  timeToMinutes,
  toScheduleFormValues,
  validateScheduleForm,
  type ScheduleFormValues,
} from '../../src/renderer/settings/schedule-model';

const values: ScheduleFormValues = {
  enabled: true,
  days: [1, 2, 3],
  start: '09:00',
  end: '17:30',
};

describe('time conversion', () => {
  it.each([
    [0, '00:00'],
    [5, '00:05'],
    [540, '09:00'],
    [1019, '16:59'],
    [1439, '23:59'],
    [1440, '00:00'],
  ])('shows %i minutes as %s', (minutes, text) => {
    expect(minutesToTime(minutes)).toBe(text);
  });

  it.each([
    ['00:00', 0],
    ['09:05', 545],
    ['23:59', 1439],
  ])('reads %s as %i minutes', (text, minutes) => {
    expect(timeToMinutes(text)).toBe(minutes);
  });

  it.each(['', '9:00', '24:00', '12:60', '12-30', 'ab:cd', '12:5', '12:300'])(
    'refuses %j',
    (text) => {
      expect(timeToMinutes(text)).toBeNull();
    },
  );
});

describe('display order', () => {
  it('lists every weekday once, Monday first and Sunday last', () => {
    expect([...DAY_DISPLAY_ORDER].sort()).toEqual([...WEEKDAYS].sort());
    expect(DAY_DISPLAY_ORDER[0]).toBe(1);
    expect(DAY_DISPLAY_ORDER.at(-1)).toBe(0);
  });

  it('has a name in copy for every weekday', () => {
    expect(copy.schedule.days).toHaveLength(7);
    for (const day of WEEKDAYS) expect(copy.schedule.days[day].trim()).not.toBe('');
  });
});

describe('toScheduleFormValues', () => {
  it('shows the default schedule as 09:00 to 17:00 on weekdays', () => {
    expect(toScheduleFormValues(DEFAULT_SCHEDULE)).toEqual({
      enabled: false,
      days: [1, 2, 3, 4, 5],
      start: '09:00',
      end: '17:00',
    });
  });

  it('shows an end of the day as 00:00', () => {
    expect(toScheduleFormValues({ ...DEFAULT_SCHEDULE, endMinute: 1440 }).end).toBe('00:00');
  });
});

describe('validateScheduleForm', () => {
  it('builds the schedule main expects', () => {
    expect(validateScheduleForm(values)).toEqual({
      ok: true,
      schedule: { enabled: true, days: [1, 2, 3], startMinute: 540, endMinute: 1050 },
    });
  });

  it('reads an end of 00:00 as the end of the day', () => {
    const result = validateScheduleForm({ ...values, end: '00:00' });
    expect(result).toMatchObject({ ok: true, schedule: { endMinute: 1440 } });
  });

  it('round-trips every stored schedule through the form values', () => {
    const stored: WorkSchedule[] = [
      DEFAULT_SCHEDULE,
      { enabled: true, days: [0, 6], startMinute: 0, endMinute: 1440 },
      { enabled: true, days: [3], startMinute: 1438, endMinute: 1439 },
    ];
    for (const schedule of stored) {
      expect(validateScheduleForm(toScheduleFormValues(schedule))).toEqual({
        ok: true,
        schedule,
      });
    }
  });

  it('keeps the enabled flag as is, so a disabled schedule can still be edited and saved', () => {
    expect(validateScheduleForm({ ...values, enabled: false })).toMatchObject({
      ok: true,
      schedule: { enabled: false },
    });
  });

  it('asks for at least one day', () => {
    expect(validateScheduleForm({ ...values, days: [] })).toEqual({
      ok: false,
      errors: { days: copy.schedule.errors.noDays },
    });
  });

  it('flags a start that is not a time', () => {
    expect(validateScheduleForm({ ...values, start: '' })).toEqual({
      ok: false,
      errors: { start: copy.schedule.errors.badTime },
    });
  });

  it('flags an end that is not a time, without also calling it too early', () => {
    expect(validateScheduleForm({ ...values, end: '25:00' })).toEqual({
      ok: false,
      errors: { end: copy.schedule.errors.badTime },
    });
  });

  it.each([
    ['equal to the start', '09:00'],
    ['before the start', '08:00'],
  ])('flags an end %s', (_name, end) => {
    expect(validateScheduleForm({ ...values, end })).toEqual({
      ok: false,
      errors: { end: copy.schedule.errors.endBeforeStart },
    });
  });

  it('reports every problem at once', () => {
    const result = validateScheduleForm({ ...values, days: [], start: 'x', end: '08:00' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['days', 'start']);
  });
});
