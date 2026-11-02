import { dirname } from 'node:path';
import {
  recentDays,
  recordOutcome,
  type DailyStats,
  type StatOutcome,
  type StatsLog,
} from '../../core/stats';
import type { SettingsFs } from '../settings/settings';
import { parseStats, serializeStats } from './stats-file';

/**
 * Keeps the statistics in `stats.json` in the user data dir, on this machine only. Loads once,
 * keeps the log in memory and writes atomically (temp file, then rename). It never throws: a
 * failed write is logged and the count still applies in memory, and a file that cannot be read is
 * set aside as `stats.json.bad` (so the next write cannot destroy it) and the log starts empty.
 */
export class StatsStore {
  private log: StatsLog = {};

  constructor(
    private readonly fs: SettingsFs,
    private readonly path: string,
    private readonly sink: (message: string) => void = () => undefined,
  ) {
    this.log = this.load();
  }

  record(outcome: StatOutcome, now: number): void {
    this.log = recordOutcome(this.log, outcome, now);
    this.save();
  }

  /** The last `count` days ending today, newest first. */
  recent(now: number, count: number): DailyStats[] {
    return recentDays(this.log, now, count);
  }

  private save(): void {
    const temp = `${this.path}.tmp`;
    try {
      this.fs.ensureDir(dirname(this.path));
      this.fs.writeFile(temp, serializeStats(this.log));
      this.fs.rename(temp, this.path);
    } catch (error) {
      this.sink(`could not save ${this.path}: ${String(error)}`);
      try {
        this.fs.remove(temp);
      } catch {
        // Only a leftover temp file; the save error above matters more.
      }
    }
  }

  private load(): StatsLog {
    let text: string | null;
    try {
      text = this.fs.readFile(this.path);
    } catch (error) {
      this.sink(`could not read ${this.path}, starting empty: ${String(error)}`);
      return {};
    }
    if (text === null) return {};

    const result = parseStats(text);
    if (result.ok) return result.log;

    this.sink(`${this.path} rejected, starting empty: ${result.reason}`);
    try {
      this.fs.rename(this.path, `${this.path}.bad`);
    } catch (error) {
      this.sink(`could not set ${this.path} aside: ${String(error)}`);
    }
    return {};
  }
}
