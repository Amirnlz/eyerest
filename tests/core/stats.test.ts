import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/core/state';
import {
  EMPTY_COUNTS,
  STATS_KEEP_DAYS,
  dayKey,
  isDayKey,
  outcomeForEvent,
  recentDays,
  recordOutcome,
  shiftDay,
  type StatsLog,
} from '../../src/core/stats';

const at = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).getTime();

describe('outcomeForEvent', () => {
  it.each<[EngineEvent, string | null]>([
    [{ type: 'rest-completed', kind: 'eye' }, 'taken'],
    [{ type: 'rest-completed', kind: 'long' }, 'taken'],
    [{ type: 'rest-skipped', kind: 'eye' }, 'skipped'],
    [{ type: 'rest-suppressed', kind: 'long' }, 'skipped'],
    [{ type: 'rest-postponed', newRestAt: 1 }, 'postponed'],
    [{ type: 'started' }, null],
    [{ type: 'stopped' }, null],
    [{ type: 'warning-started', restAt: 1 }, null],
    [{ type: 'rest-started', kind: 'eye', endsAt: 1 }, null],
    [{ type: 'away-started', since: 0 }, null],
    [{ type: 'away-ended', reset: true }, null],
  ])('maps %j to %s', (event, outcome) => {
    expect(outcomeForEvent(event)).toBe(outcome);
  });
});

describe('dayKey', () => {
  it('is the local calendar day, zero padded', () => {
    expect(dayKey(at(2026, 1, 5))).toBe('2026-01-05');
    expect(dayKey(at(2026, 11, 2))).toBe('2026-11-02');
  });

  it('changes exactly at local midnight', () => {
    expect(dayKey(at(2026, 11, 2, 23, 59))).toBe('2026-11-02');
    expect(dayKey(at(2026, 11, 3, 0, 0))).toBe('2026-11-03');
  });
});

describe('isDayKey', () => {
  it.each(['2026-11-02', '2024-02-29', '0999-01-01'])('accepts %s', (key) => {
    expect(isDayKey(key)).toBe(true);
  });

  it.each(['', '2026-2-2', '2026-13-01', '2026-02-30', '2025-02-29', '2026-11-02T00', 'today'])(
    'refuses %j',
    (key) => {
      expect(isDayKey(key)).toBe(false);
    },
  );
});

describe('shiftDay', () => {
  it('moves by calendar days across month and year ends', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDay('2026-11-02', 0)).toBe('2026-11-02');
  });

  it('never skips or repeats a day, whatever the daylight saving rules of the zone', () => {
    // Walk a whole year one day at a time: every step must differ and be the next date.
    let key = '2026-01-01';
    const seen = new Set<string>([key]);
    for (let i = 0; i < 365; i++) {
      key = shiftDay(key, 1);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(key).toBe('2027-01-01');
  });

  it('refuses a key that is not a day', () => {
    expect(() => shiftDay('nope', 1)).toThrow(RangeError);
  });
});

describe('recordOutcome', () => {
  const now = at(2026, 11, 2);

  it('starts a day at one for the outcome and zero for the rest', () => {
    expect(recordOutcome({}, 'taken', now)).toEqual({
      '2026-11-02': { taken: 1, skipped: 0, postponed: 0 },
    });
  });

  it('adds to the same day and leaves other days alone', () => {
    let log: StatsLog = { '2026-11-01': { taken: 5, skipped: 0, postponed: 0 } };
    log = recordOutcome(log, 'taken', now);
    log = recordOutcome(log, 'taken', now);
    log = recordOutcome(log, 'skipped', now);
    log = recordOutcome(log, 'postponed', now);
    expect(log).toEqual({
      '2026-11-01': { taken: 5, skipped: 0, postponed: 0 },
      '2026-11-02': { taken: 2, skipped: 1, postponed: 1 },
    });
  });

  it('counts on the day of the event, so an event after midnight starts a new day', () => {
    let log: StatsLog = {};
    log = recordOutcome(log, 'taken', at(2026, 11, 2, 23, 59));
    log = recordOutcome(log, 'taken', at(2026, 11, 3, 0, 1));
    expect(Object.keys(log).sort()).toEqual(['2026-11-02', '2026-11-03']);
  });

  it('does not change its input', () => {
    const log: StatsLog = { '2026-11-02': { taken: 1, skipped: 0, postponed: 0 } };
    const copy = JSON.stringify(log);
    recordOutcome(log, 'skipped', now);
    expect(JSON.stringify(log)).toBe(copy);
  });

  it('drops days older than the retention window and keeps the oldest day inside it', () => {
    const oldest = shiftDay('2026-11-02', -(STATS_KEEP_DAYS - 1));
    const tooOld = shiftDay('2026-11-02', -STATS_KEEP_DAYS);
    const log: StatsLog = {
      [tooOld]: { taken: 1, skipped: 0, postponed: 0 },
      [oldest]: { taken: 2, skipped: 0, postponed: 0 },
    };
    const next = recordOutcome(log, 'taken', now);
    expect(Object.keys(next)).toContain(oldest);
    expect(Object.keys(next)).not.toContain(tooOld);
    expect(next['2026-11-02']?.taken).toBe(1);
  });
});

describe('recentDays', () => {
  it('lists the last days newest first, today included, with zeros for quiet days', () => {
    const log: StatsLog = {
      '2026-11-02': { taken: 3, skipped: 1, postponed: 0 },
      '2026-10-31': { taken: 1, skipped: 0, postponed: 2 },
    };
    expect(recentDays(log, at(2026, 11, 2), 4)).toEqual([
      { date: '2026-11-02', taken: 3, skipped: 1, postponed: 0 },
      { date: '2026-11-01', ...EMPTY_COUNTS },
      { date: '2026-10-31', taken: 1, skipped: 0, postponed: 2 },
      { date: '2026-10-30', ...EMPTY_COUNTS },
    ]);
  });

  it('returns only zero days for an empty log, and nothing for a count of zero', () => {
    const days = recentDays({}, at(2026, 11, 2), 7);
    expect(days).toHaveLength(7);
    expect(days.every((day) => day.taken + day.skipped + day.postponed === 0)).toBe(true);
    expect(recentDays({}, at(2026, 11, 2), 0)).toEqual([]);
  });

  it('crosses a month boundary', () => {
    expect(recentDays({}, at(2026, 3, 2), 3).map((day) => day.date)).toEqual([
      '2026-03-02',
      '2026-03-01',
      '2026-02-28',
    ]);
  });
});
