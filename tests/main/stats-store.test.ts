import { describe, expect, it } from 'vitest';
import { StatsStore } from '../../src/main/stats/stats-store';
import { FakeSettingsFs } from '../helpers/fake-lifecycle';

const PATH = '/data/stats.json';
const NOW = new Date(2026, 10, 2, 12, 0).getTime();

function setup(initial?: string) {
  const fs = new FakeSettingsFs();
  if (initial !== undefined) fs.files.set(PATH, initial);
  const messages: string[] = [];
  const store = new StatsStore(fs, PATH, (message) => messages.push(message));
  return { fs, store, messages };
}

describe('StatsStore', () => {
  it('starts empty without a file, and says nothing', () => {
    const { store, messages } = setup();
    expect(store.recent(NOW, 1)).toEqual([{ date: '2026-11-02', taken: 0, skipped: 0, postponed: 0 }]);
    expect(messages).toEqual([]);
  });

  it('counts outcomes and writes the file atomically, temp file then rename', () => {
    const { store, fs } = setup();
    store.record('taken', NOW);
    store.record('skipped', NOW);

    expect(store.recent(NOW, 1)[0]).toEqual({
      date: '2026-11-02',
      taken: 1,
      skipped: 1,
      postponed: 0,
    });
    expect(fs.ops.slice(0, 3)).toEqual([
      'ensureDir /data',
      `writeFile ${PATH}.tmp`,
      `rename ${PATH}.tmp ${PATH}`,
    ]);
    expect(JSON.parse(fs.files.get(PATH) ?? '{}')).toEqual({
      version: 1,
      days: { '2026-11-02': { taken: 1, skipped: 1, postponed: 0 } },
    });
  });

  it('survives a restart', () => {
    const { store, fs } = setup();
    store.record('postponed', NOW);
    const again = new StatsStore(fs, PATH);
    expect(again.recent(NOW, 1)[0]?.postponed).toBe(1);
  });

  it('keeps counting in memory when a write fails, logs it, and removes the temp file', () => {
    const { store, fs, messages } = setup();
    fs.failOn = 'rename';
    store.record('taken', NOW);

    expect(store.recent(NOW, 1)[0]?.taken).toBe(1);
    expect(messages).toEqual([expect.stringContaining('could not save')]);
    expect(fs.ops).toContain(`remove ${PATH}.tmp`);
  });

  it('sets a rejected file aside instead of overwriting it, and starts empty', () => {
    const { store, fs, messages } = setup('{nope');
    expect(store.recent(NOW, 1)[0]?.taken).toBe(0);
    expect(fs.files.get(`${PATH}.bad`)).toBe('{nope');
    expect(messages).toEqual([expect.stringContaining('rejected')]);

    store.record('taken', NOW);
    expect(fs.files.get(`${PATH}.bad`)).toBe('{nope');
    expect(JSON.parse(fs.files.get(PATH) ?? '{}')).toMatchObject({ version: 1 });
  });

  it('starts empty and logs when the file cannot be read, without throwing', () => {
    const fs = new FakeSettingsFs();
    fs.readError = new Error('EACCES');
    const messages: string[] = [];
    const store = new StatsStore(fs, PATH, (message) => messages.push(message));
    expect(store.recent(NOW, 1)[0]?.taken).toBe(0);
    expect(messages).toEqual([expect.stringContaining('EACCES')]);
  });

  it('loads an existing valid file', () => {
    const { store } = setup(
      '{"version":1,"days":{"2026-11-01":{"taken":4,"skipped":1,"postponed":0}}}',
    );
    expect(store.recent(NOW, 2)).toEqual([
      { date: '2026-11-02', taken: 0, skipped: 0, postponed: 0 },
      { date: '2026-11-01', taken: 4, skipped: 1, postponed: 0 },
    ]);
  });
});
