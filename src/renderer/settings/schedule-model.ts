import {
  MINUTES_PER_DAY,
  type Weekday,
  type WorkSchedule,
  validateSchedule,
} from '../../core/schedule';
import { copy } from '../copy';

/** Monday first, the order a work week reads in. Values are `Date.getDay()` numbers. */
export const DAY_DISPLAY_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** What the controls hold: times as the `HH:MM` text of a time input. */
export interface ScheduleFormValues {
  readonly enabled: boolean;
  readonly days: readonly Weekday[];
  readonly start: string;
  readonly end: string;
}

export interface ScheduleFormErrors {
  days?: string;
  start?: string;
  end?: string;
}

export type ScheduleFormValidation =
  | { readonly ok: true; readonly schedule: WorkSchedule }
  | { readonly ok: false; readonly errors: ScheduleFormErrors };

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes after midnight as `HH:MM`. The end of the day (1440) shows as `00:00`. */
export function minutesToTime(minutes: number): string {
  const wrapped = minutes % MINUTES_PER_DAY;
  const hours = Math.floor(wrapped / 60);
  return `${String(hours).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** `HH:MM` as minutes after midnight, or null when the text is not a time. */
export function timeToMinutes(text: string): number | null {
  const match = TIME.exec(text);
  if (match === null) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function toScheduleFormValues(schedule: WorkSchedule): ScheduleFormValues {
  return {
    enabled: schedule.enabled,
    days: schedule.days,
    start: minutesToTime(schedule.startMinute),
    end: minutesToTime(schedule.endMinute),
  };
}

/**
 * Turns the controls into a `WorkSchedule`, or into one message per bad control. Pure. An end of
 * `00:00` means the end of the day, because a time input cannot say 24:00. The result also passes
 * `validateSchedule`, the same check main applies.
 */
export function validateScheduleForm(values: ScheduleFormValues): ScheduleFormValidation {
  const errors: ScheduleFormErrors = {};
  if (values.days.length === 0) errors.days = copy.schedule.errors.noDays;

  const start = timeToMinutes(values.start);
  const parsedEnd = timeToMinutes(values.end);
  if (start === null) errors.start = copy.schedule.errors.badTime;
  if (parsedEnd === null) errors.end = copy.schedule.errors.badTime;
  const end = parsedEnd === 0 ? MINUTES_PER_DAY : parsedEnd;
  if (start !== null && end !== null && errors.end === undefined && end <= start) {
    errors.end = copy.schedule.errors.endBeforeStart;
  }
  if (Object.keys(errors).length > 0 || start === null || end === null) {
    return { ok: false, errors };
  }

  const checked = validateSchedule({
    enabled: values.enabled,
    days: values.days,
    startMinute: start,
    endMinute: end,
  });
  return checked.ok ? checked : { ok: false, errors: { days: checked.error } };
}
