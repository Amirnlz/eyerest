import { describe, expect, it } from 'vitest';
import type { DailyStats } from '../../src/core/stats';
import { copy } from '../../src/renderer/copy';
import { dayLabel, totalsOf } from '../../src/renderer/stats/stats-model';

const day = (date: string, taken = 0, skipped = 0, postponed = 0): DailyStats => ({
  date,
  taken,
  skipped,
  postponed,
});

describe('totalsOf', () => {
  it('sums each column', () => {
    expect(totalsOf([day('2026-11-02', 3, 1, 0), day('2026-11-01', 2, 0, 4)])).toEqual({
      taken: 5,
      skipped: 1,
      postponed: 4,
    });
  });

  it('is zero for no days', () => {
    expect(totalsOf([])).toEqual({ taken: 0, skipped: 0, postponed: 0 });
  });
});

describe('dayLabel', () => {
  it('names the first two rows Today and Yesterday, whatever their dates', () => {
    expect(dayLabel(day('2026-11-02'), 0, 'en-US')).toBe(copy.stats.today);
    expect(dayLabel(day('2026-11-01'), 1, 'en-US')).toBe(copy.stats.yesterday);
  });

  it('shows an earlier day as weekday, month and day', () => {
    // 2026-10-30 is a Friday.
    expect(dayLabel(day('2026-10-30'), 3, 'en-US')).toBe('Fri, Oct 30');
  });

  it('reads the date as a local day, so no time zone moves it to its neighbour', () => {
    expect(dayLabel(day('2026-01-01'), 5, 'en-US')).toBe('Thu, Jan 1');
  });
});
