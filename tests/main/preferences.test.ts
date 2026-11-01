import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  serializePreferences,
} from '../../src/main/preferences/preferences';
import { PreferencesStore, soundPrefsView } from '../../src/main/preferences/preferences-store';
import { FakeSettingsFs } from '../helpers/fake-lifecycle';

describe('parsePreferences', () => {
  it('reads every key', () => {
    expect(parsePreferences('{"soundMuted":true,"soundVolume":"high","theme":"dark"}')).toEqual({
      prefs: { sound: { muted: true, volume: 'high' }, theme: 'dark' },
      status: 'loaded',
      issues: [],
    });
  });

  it('keeps the default for a missing key, so an older file still loads', () => {
    expect(parsePreferences('{"soundMuted":true}').prefs).toEqual({
      sound: { muted: true, volume: 'medium' },
      theme: 'system',
    });
    expect(parsePreferences('{}').prefs).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"theme":"light"}').prefs.sound).toEqual(DEFAULT_PREFERENCES.sound);
  });

  it('defaults to sound on at medium and the System theme', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      sound: { muted: false, volume: 'medium' },
      theme: 'system',
    });
  });

  it('ignores unknown keys with an issue', () => {
    const result = parsePreferences('{"colour":"red"}');
    expect(result.status).toBe('loaded');
    expect(result.issues).toEqual(['ignored unknown preference "colour"']);
  });

  it.each([
    ['bad JSON', '{nope'],
    ['an array', '[]'],
    ['null', 'null'],
    ['a string', '"x"'],
    ['a non-boolean mute', '{"soundMuted":"yes"}'],
    ['an unknown volume', '{"soundVolume":"loud"}'],
    ['a numeric volume', '{"soundVolume":0.5}'],
    ['an unknown theme', '{"theme":"blue"}'],
    ['a capitalized theme', '{"theme":"Dark"}'],
    ['a non-string theme', '{"theme":1}'],
  ])('rejects %s as a whole and returns the defaults', (_name, text) => {
    const result = parsePreferences(text);
    expect(result.status).toBe('invalid');
    expect(result.prefs).toEqual(DEFAULT_PREFERENCES);
    expect(result.issues).toHaveLength(1);
  });

  it('names the allowed themes when one is wrong', () => {
    expect(parsePreferences('{"theme":"blue"}').issues[0]).toContain('"system", "light", "dark"');
  });

  it('round-trips through serialize', () => {
    const prefs = { sound: { muted: true, volume: 'low' }, theme: 'light' } as const;
    expect(parsePreferences(serializePreferences(prefs)).prefs).toEqual(prefs);
  });

  it('writes the sound keys under their file names, so existing files keep working', () => {
    expect(JSON.parse(serializePreferences(DEFAULT_PREFERENCES))).toEqual({
      soundMuted: false,
      soundVolume: 'medium',
      theme: 'system',
    });
  });
});

describe('PreferencesStore', () => {
  const PATH = '/data/preferences.json';

  function setup(initial?: string) {
    const fs = new FakeSettingsFs();
    if (initial !== undefined) fs.files.set(PATH, initial);
    const log: string[] = [];
    const store = new PreferencesStore(fs, PATH, (message) => log.push(message));
    return { fs, store, log };
  }

  it('starts with the defaults when there is no file', () => {
    const { store, log } = setup();
    expect(store.get()).toEqual(DEFAULT_PREFERENCES);
    expect(log).toEqual([]);
  });

  it('loads a file written by the sound-only version', () => {
    expect(setup('{"soundMuted":true,"soundVolume":"low"}').store.get()).toEqual({
      sound: { muted: true, volume: 'low' },
      theme: 'system',
    });
  });

  it('uses the defaults and logs for a rejected file, without throwing', () => {
    const { store, log } = setup('{"theme":"blue"}');
    expect(store.get()).toEqual(DEFAULT_PREFERENCES);
    expect(log).toEqual([expect.stringContaining('theme')]);
  });

  it('uses the defaults and logs when the file cannot be read', () => {
    const fs = new FakeSettingsFs();
    fs.readError = new Error('EACCES');
    const log: string[] = [];
    expect(new PreferencesStore(fs, PATH, (message) => log.push(message)).get()).toEqual(
      DEFAULT_PREFERENCES,
    );
    expect(log).toEqual([expect.stringContaining('EACCES')]);
  });

  it('update applies at once and writes atomically: temp file, then rename', () => {
    const { fs, store } = setup();
    store.update({ theme: 'dark' });

    expect(store.get().theme).toBe('dark');
    expect(fs.ops).toEqual([
      'ensureDir /data',
      `writeFile ${PATH}.tmp`,
      `rename ${PATH}.tmp ${PATH}`,
    ]);
    expect(parsePreferences(fs.files.get(PATH) ?? '').prefs.theme).toBe('dark');
  });

  it('a change to one part keeps the other part', () => {
    const { store } = setup('{"soundMuted":true,"soundVolume":"high"}');
    store.update({ theme: 'light' });
    expect(store.get()).toEqual({ sound: { muted: true, volume: 'high' }, theme: 'light' });

    store.update({ sound: { muted: false, volume: 'low' } });
    expect(store.get()).toEqual({ sound: { muted: false, volume: 'low' }, theme: 'light' });
  });

  it('both parts survive a restart', () => {
    const { fs, store } = setup();
    store.update({ theme: 'dark' });
    store.update({ sound: { muted: true, volume: 'low' } });
    expect(new PreferencesStore(fs, PATH).get()).toEqual({
      sound: { muted: true, volume: 'low' },
      theme: 'dark',
    });
  });

  it('a failed write is logged, cleans up, and the change still applies in memory', () => {
    const { fs, store, log } = setup();
    fs.failOn = 'rename';
    store.update({ theme: 'dark' });

    expect(store.get().theme).toBe('dark');
    expect(log).toEqual([expect.stringContaining('rename failed')]);
    expect(fs.ops).toContain(`remove ${PATH}.tmp`);
    expect(fs.files.has(PATH)).toBe(false);
  });
});

describe('soundPrefsView', () => {
  it('reads and writes the sound part only', () => {
    const fs = new FakeSettingsFs();
    const store = new PreferencesStore(fs, '/data/preferences.json');
    store.update({ theme: 'dark' });
    const view = soundPrefsView(store);

    expect(view.get()).toEqual({ muted: false, volume: 'medium' });
    view.set({ muted: true, volume: 'high' });

    expect(store.get()).toEqual({ sound: { muted: true, volume: 'high' }, theme: 'dark' });
    expect(view.get()).toEqual({ muted: true, volume: 'high' });
  });

  it('does not let the caller change the stored value afterwards', () => {
    const store = new PreferencesStore(new FakeSettingsFs(), '/data/preferences.json');
    const next = { muted: false, volume: 'low' as const };
    soundPrefsView(store).set(next);
    expect(store.get().sound).not.toBe(next);
  });
});
