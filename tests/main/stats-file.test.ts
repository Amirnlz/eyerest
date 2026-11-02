import { describe, expect, it } from 'vitest';
import type { StatsLog } from '../../src/core/stats';
import { parseStats, serializeStats } from '../../src/main/stats/stats-file';

const log: StatsLog = {
  '2026-11-02': { taken: 3, skipped: 1, postponed: 2 },
  '2026-11-01': { taken: 0, skipped: 0, postponed: 0 },
};

describe('stats file', () => {
  it('round-trips a log', () => {
    expect(parseStats(serializeStats(log))).toEqual({ ok: true, log });
  });

  it('writes a version and the days in date order, so the file diffs cleanly', () => {
    const text = serializeStats(log);
    expect(JSON.parse(text)).toEqual({ version: 1, days: log });
    expect(text.indexOf('2026-11-01')).toBeLessThan(text.indexOf('2026-11-02'));
    expect(text.endsWith('\n')).toBe(true);
  });

  it('reads an empty log', () => {
    expect(parseStats('{"version":1,"days":{}}')).toEqual({ ok: true, log: {} });
  });

  it.each([
    ['bad JSON', '{nope'],
    ['an array', '[]'],
    ['null', 'null'],
    ['a missing version', '{"days":{}}'],
    ['another version', '{"version":2,"days":{}}'],
    ['missing days', '{"version":1}'],
    ['days as an array', '{"version":1,"days":[]}'],
    ['a key that is not a day', '{"version":1,"days":{"today":{"taken":1,"skipped":0,"postponed":0}}}'],
    ['an impossible date', '{"version":1,"days":{"2026-02-30":{"taken":1,"skipped":0,"postponed":0}}}'],
    ['counts that are not an object', '{"version":1,"days":{"2026-11-02":3}}'],
    ['a missing count', '{"version":1,"days":{"2026-11-02":{"taken":1,"skipped":0}}}'],
    ['an extra count', '{"version":1,"days":{"2026-11-02":{"taken":1,"skipped":0,"postponed":0,"x":1}}}'],
    ['a negative count', '{"version":1,"days":{"2026-11-02":{"taken":-1,"skipped":0,"postponed":0}}}'],
    ['a fractional count', '{"version":1,"days":{"2026-11-02":{"taken":1.5,"skipped":0,"postponed":0}}}'],
    ['a string count', '{"version":1,"days":{"2026-11-02":{"taken":"1","skipped":0,"postponed":0}}}'],
  ])('rejects %s with a reason', (_name, text) => {
    const result = parseStats(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(0);
  });
});
