import type { DailyStats, DayCounts } from '../../core/stats';
import { copy } from '../copy';

/** The sum over the shown days. */
export function totalsOf(days: readonly DayCounts[]): DayCounts {
  return days.reduce<DayCounts>(
    (sum, day) => ({
      taken: sum.taken + day.taken,
      skipped: sum.skipped + day.skipped,
      postponed: sum.postponed + day.postponed,
    }),
    { taken: 0, skipped: 0, postponed: 0 },
  );
}

/**
 * The row label for a day. `index` is its place in the list main sends, newest first, so 0 is
 * today and 1 is yesterday: the renderer holds no date logic beyond formatting. Other days read as
 * a short weekday, month and day in the viewer's locale.
 */
export function dayLabel(day: DailyStats, index: number, locale?: string): string {
  if (index === 0) return copy.stats.today;
  if (index === 1) return copy.stats.yesterday;
  const [year, month, date] = day.date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1),
  );
}
