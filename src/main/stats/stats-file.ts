import { isDayKey, type DayCounts, type StatsLog } from '../../core/stats';

export const STATS_FILE_NAME = 'stats.json';

/** Bumped when the file shape changes, so a newer file is never misread by an older app. */
export const STATS_FILE_VERSION = 1;

export type StatsLoad =
  | { readonly ok: true; readonly log: StatsLog }
  | { readonly ok: false; readonly reason: string };

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseCounts(value: unknown): DayCounts | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = new Map(Object.entries(value));
  if (record.size !== 3) return null;
  const taken = record.get('taken');
  const skipped = record.get('skipped');
  const postponed = record.get('postponed');
  if (!isCount(taken) || !isCount(skipped) || !isCount(postponed)) return null;
  return { taken, skipped, postponed };
}

/**
 * Parses the stats file. Pure and never throws. Strict: any wrong shape rejects the whole file, so
 * the caller can set it aside instead of silently dropping part of it.
 */
export function parseStats(text: string): StatsLoad {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      reason: `not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: 'must be a JSON object' };
  }
  const file = new Map(Object.entries(parsed));
  if (file.get('version') !== STATS_FILE_VERSION) {
    return { ok: false, reason: `version must be ${STATS_FILE_VERSION}` };
  }
  const days = file.get('days');
  if (typeof days !== 'object' || days === null || Array.isArray(days)) {
    return { ok: false, reason: 'days must be an object' };
  }

  const log: Record<string, DayCounts> = {};
  for (const [key, value] of Object.entries(days)) {
    if (!isDayKey(key)) return { ok: false, reason: `"${key}" is not a day (YYYY-MM-DD)` };
    const counts = parseCounts(value);
    if (counts === null) return { ok: false, reason: `counts for ${key} are not valid` };
    log[key] = counts;
  }
  return { ok: true, log };
}

export function serializeStats(log: StatsLog): string {
  const days = Object.fromEntries(Object.entries(log).sort(([a], [b]) => a.localeCompare(b)));
  return `${JSON.stringify({ version: STATS_FILE_VERSION, days }, null, 2)}\n`;
}
