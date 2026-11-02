import type { EngineEvent } from './state';

/**
 * Rest statistics: how many rests were taken, skipped or postponed on each local day. Pure domain:
 * no clock and no I/O. Time enters only as the `now` argument, read in the machine's local zone.
 */

export type StatOutcome = 'taken' | 'skipped' | 'postponed';

export interface DayCounts {
  readonly taken: number;
  readonly skipped: number;
  readonly postponed: number;
}

/** Counts by local day. The key is `YYYY-MM-DD`; a day without rests has no entry. */
export type StatsLog = Readonly<Record<string, DayCounts>>;

/** One day as the settings window shows it. */
export interface DailyStats extends DayCounts {
  readonly date: string;
}

export const EMPTY_COUNTS: DayCounts = Object.freeze({ taken: 0, skipped: 0, postponed: 0 });

/** How many days are kept. Older entries are dropped when a new rest is recorded. */
export const STATS_KEEP_DAYS = 90;

/**
 * What an engine event means for the statistics, or null when it is not an outcome.
 * - `rest-completed`: the full rest ran out, so it was taken.
 * - `rest-skipped`: the person skipped it, or do not disturb ended it at once.
 * - `rest-suppressed`: do not disturb swallowed a rest that fell due. Counted as skipped, because
 *   the engine already treats it like a skip for the "every 3rd is long" cycle.
 * - `rest-postponed`: moved later. The same rest can be postponed more than once and each postpone
 *   counts, so the number reads "times Postpone was used".
 * A rest cut short by Pause, or an absence that resets the cycle, emits no outcome and is not counted.
 */
export function outcomeForEvent(event: EngineEvent): StatOutcome | null {
  switch (event.type) {
    case 'rest-completed':
      return 'taken';
    case 'rest-skipped':
    case 'rest-suppressed':
      return 'skipped';
    case 'rest-postponed':
      return 'postponed';
    default:
      return null;
  }
}

const KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** The local calendar day of a timestamp, as `YYYY-MM-DD`. */
export function dayKey(now: number): string {
  const date = new Date(now);
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
}

/** True for a real calendar day in the `YYYY-MM-DD` form, so `2026-02-30` is refused. */
export function isDayKey(value: string): boolean {
  const match = KEY_PATTERN.exec(value);
  if (match === null) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/**
 * The day `delta` calendar days from `key`. Moves by calendar date, never by 24-hour steps, so a
 * daylight saving change cannot skip or repeat a day.
 */
export function shiftDay(key: string, delta: number): string {
  const match = KEY_PATTERN.exec(key);
  if (match === null) throw new RangeError(`not a day key: ${key}`);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + delta);
  return dayKey(date.getTime());
}

/**
 * The log with one more outcome on the day of `now`, and entries older than `STATS_KEEP_DAYS`
 * dropped. Returns a new object and never changes its input.
 */
export function recordOutcome(log: StatsLog, outcome: StatOutcome, now: number): StatsLog {
  const today = dayKey(now);
  const oldest = shiftDay(today, -(STATS_KEEP_DAYS - 1));
  const next: Record<string, DayCounts> = {};
  for (const [key, counts] of Object.entries(log)) {
    if (key >= oldest) next[key] = counts;
  }
  const current = next[today] ?? EMPTY_COUNTS;
  next[today] = { ...current, [outcome]: current[outcome] + 1 };
  return next;
}

/** The last `count` days ending today, newest first, with zeros for days without rests. */
export function recentDays(log: StatsLog, now: number, count: number): DailyStats[] {
  const today = dayKey(now);
  const days: DailyStats[] = [];
  for (let offset = 0; offset < count; offset++) {
    const date = shiftDay(today, -offset);
    days.push({ date, ...(log[date] ?? EMPTY_COUNTS) });
  }
  return days;
}
