/**
 * Working hours: the days and the time of day when reminders run. Pure domain: no clock, no I/O.
 * Time enters only as the `now` argument of `isWithinSchedule`.
 */

export const MINUTES_PER_DAY = 24 * 60;

/** Day of the week as `Date.getDay()` gives it: 0 is Sunday, 6 is Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export interface WorkSchedule {
  /** Off by default: reminders then run at all times, as before this feature existed. */
  readonly enabled: boolean;
  /** Active days, sorted and without duplicates. Never empty. */
  readonly days: readonly Weekday[];
  /** First active minute of the day, in minutes after local midnight. 0 to 1439. */
  readonly startMinute: number;
  /**
   * First minute after the window, so the end is exclusive. 1 to 1440, where 1440 is the end of the
   * day. Always later than `startMinute`: a window never crosses midnight.
   */
  readonly endMinute: number;
}

export const DEFAULT_SCHEDULE: WorkSchedule = Object.freeze({
  enabled: false,
  days: Object.freeze<Weekday[]>([1, 2, 3, 4, 5]),
  startMinute: 9 * 60,
  endMinute: 17 * 60,
});

export type ScheduleValidation =
  | { readonly ok: true; readonly schedule: WorkSchedule }
  | { readonly ok: false; readonly error: string };

const KEYS = ['enabled', 'days', 'startMinute', 'endMinute'] as const;

function fail(error: string): ScheduleValidation {
  return { ok: false, error };
}

function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

/**
 * Checks an untrusted value (an IPC payload or a stored file). Pure and never throws. Strict: every
 * key must be present and no other key is allowed, so a typo is an error and not a silent default.
 * The result is normalized (days sorted), so equal schedules compare equal.
 */
export function validateSchedule(value: unknown): ScheduleValidation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('Working hours must be an object.');
  }
  const received = new Map(Object.entries(value));
  for (const key of received.keys()) {
    if (!KEYS.some((known) => known === key)) return fail(`Unknown working hours field "${key}".`);
  }

  const enabled = received.get('enabled');
  if (typeof enabled !== 'boolean') return fail('enabled must be true or false.');

  const days = received.get('days');
  if (!Array.isArray(days) || days.length === 0) return fail('Choose at least one day.');
  const picked: Weekday[] = [];
  for (const day of days as unknown[]) {
    if (!isWeekday(day)) return fail('Days must be whole numbers from 0 (Sunday) to 6 (Saturday).');
    if (!picked.includes(day)) picked.push(day);
  }
  picked.sort((a, b) => a - b);

  const startMinute = received.get('startMinute');
  const endMinute = received.get('endMinute');
  if (typeof startMinute !== 'number' || !Number.isInteger(startMinute)) {
    return fail('startMinute must be a whole number.');
  }
  if (typeof endMinute !== 'number' || !Number.isInteger(endMinute)) {
    return fail('endMinute must be a whole number.');
  }
  if (startMinute < 0 || startMinute > MINUTES_PER_DAY - 1) {
    return fail(`startMinute must be between 0 and ${MINUTES_PER_DAY - 1}.`);
  }
  if (endMinute < 1 || endMinute > MINUTES_PER_DAY) {
    return fail(`endMinute must be between 1 and ${MINUTES_PER_DAY}.`);
  }
  if (endMinute <= startMinute) return fail('The end must be later than the start.');

  return { ok: true, schedule: { enabled, days: picked, startMinute, endMinute } };
}

export function sameSchedule(a: WorkSchedule, b: WorkSchedule): boolean {
  return (
    a.enabled === b.enabled &&
    a.startMinute === b.startMinute &&
    a.endMinute === b.endMinute &&
    a.days.length === b.days.length &&
    a.days.every((day, index) => day === b.days[index])
  );
}

/**
 * True when reminders may run at `now` (milliseconds since the epoch, read in the machine's local
 * time zone). A disabled schedule is always true. The window is the start minute up to, and not
 * including, the end minute, on the listed days only. Reading the local day and minute from the
 * timestamp makes a clock change or a daylight saving shift take effect on the next check.
 */
export function isWithinSchedule(schedule: WorkSchedule, now: number): boolean {
  if (!schedule.enabled) return true;
  const date = new Date(now);
  const day = date.getDay();
  const minute = date.getHours() * 60 + date.getMinutes();
  return (
    schedule.days.some((active) => active === day) &&
    minute >= schedule.startMinute &&
    minute < schedule.endMinute
  );
}
