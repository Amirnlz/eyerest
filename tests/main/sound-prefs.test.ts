import { describe, expect, it } from 'vitest';
import { DEFAULT_SOUND_PREFS } from '../../src/shared/sound';
import { parseSoundPrefs, serializeSoundPrefs } from '../../src/main/sound/sound-prefs';
import { SoundPrefsStore } from '../../src/main/sound/sound-prefs-store';
import { FakeSettingsFs } from '../helpers/fake-lifecycle';

describe('parseSoundPrefs', () => {
  it('reads both keys', () => {
    expect(parseSoundPrefs('{"soundMuted":true,"soundVolume":"high"}')).toEqual({
      prefs: { muted: true, volume: 'high' },
      status: 'loaded',
      issues: [],
    });
  });

  it('keeps the default for a missing key', () => {
    expect(parseSoundPrefs('{"soundMuted":true}').prefs).toEqual({ muted: true, volume: 'medium' });
    expect(parseSoundPrefs('{}').prefs).toEqual(DEFAULT_SOUND_PREFS);
  });

  it('ignores unknown keys with an issue', () => {
    const result = parseSoundPrefs('{"theme":"dark"}');
    expect(result.status).toBe('loaded');
    expect(result.issues).toEqual(['ignored unknown preference "theme"']);
  });

  it.each([
    ['bad JSON', '{nope'],
    ['an array', '[]'],
    ['null', 'null'],
    ['a string', '"x"'],
    ['a non-boolean mute', '{"soundMuted":"yes"}'],
    ['an unknown volume', '{"soundVolume":"loud"}'],
    ['a numeric volume', '{"soundVolume":0.5}'],
  ])('rejects %s as a whole and returns the defaults', (_name, text) => {
    const result = parseSoundPrefs(text);
    expect(result.status).toBe('invalid');
    expect(result.prefs).toEqual(DEFAULT_SOUND_PREFS);
    expect(result.issues).toHaveLength(1);
  });

  it('round-trips through serialize', () => {
    const prefs = { muted: true, volume: 'low' } as const;
    expect(parseSoundPrefs(serializeSoundPrefs(prefs)).prefs).toEqual(prefs);
  });
});

describe('SoundPrefsStore', () => {
  const PATH = '/data/preferences.json';

  function setup(initial?: string) {
    const fs = new FakeSettingsFs();
    if (initial !== undefined) fs.files.set(PATH, initial);
    const log: string[] = [];
    const store = new SoundPrefsStore(fs, PATH, (message) => log.push(message));
    return { fs, store, log };
  }

  it('starts with the defaults when there is no file', () => {
    const { store, log } = setup();
    expect(store.get()).toEqual(DEFAULT_SOUND_PREFS);
    expect(log).toEqual([]);
  });

  it('loads saved choices', () => {
    expect(setup('{"soundMuted":true,"soundVolume":"low"}').store.get()).toEqual({
      muted: true,
      volume: 'low',
    });
  });

  it('uses the defaults and logs for a rejected file, without throwing', () => {
    const { store, log } = setup('{"soundVolume":"loud"}');
    expect(store.get()).toEqual(DEFAULT_SOUND_PREFS);
    expect(log).toEqual([expect.stringContaining('soundVolume')]);
  });

  it('uses the defaults and logs when the file cannot be read', () => {
    const fs = new FakeSettingsFs();
    fs.readError = new Error('EACCES');
    const log: string[] = [];
    const store = new SoundPrefsStore(fs, PATH, (message) => log.push(message));
    expect(store.get()).toEqual(DEFAULT_SOUND_PREFS);
    expect(log).toEqual([expect.stringContaining('EACCES')]);
  });

  it('set applies at once and writes atomically: temp file, then rename', () => {
    const { fs, store } = setup();
    store.set({ muted: true, volume: 'high' });

    expect(store.get()).toEqual({ muted: true, volume: 'high' });
    expect(fs.ops).toEqual([
      'ensureDir /data',
      `writeFile ${PATH}.tmp`,
      `rename ${PATH}.tmp ${PATH}`,
    ]);
    expect(parseSoundPrefs(fs.files.get(PATH) ?? '').prefs).toEqual({ muted: true, volume: 'high' });
  });

  it('a new store reads what the last one saved', () => {
    const { fs, store } = setup();
    store.set({ muted: false, volume: 'low' });
    expect(new SoundPrefsStore(fs, PATH).get()).toEqual({ muted: false, volume: 'low' });
  });

  it('a failed write is logged, cleans up, and the choice still applies in memory', () => {
    const { fs, store, log } = setup();
    fs.failOn = 'rename';
    store.set({ muted: true, volume: 'medium' });

    expect(store.get().muted).toBe(true);
    expect(log).toEqual([expect.stringContaining('rename failed')]);
    expect(fs.ops).toContain(`remove ${PATH}.tmp`);
    expect(fs.files.has(PATH)).toBe(false);
  });

  it('does not let the caller change the stored value afterwards', () => {
    const { store } = setup();
    const next = { muted: false, volume: 'low' as const };
    store.set(next);
    expect(store.get()).not.toBe(next);
  });
});
