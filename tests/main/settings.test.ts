import { describe, expect, it } from 'vitest';
import { ConfigError } from '../../src/core/config';
import { loadSettings, parseSettings, saveSettings } from '../../src/main/settings/settings';
import { FakeSettingsFs } from '../helpers/fake-lifecycle';

const PATH = '/data/eyerest/settings.json';

describe('parseSettings', () => {
  it('accepts a partial override', () => {
    const result = parseSettings('{ "workIntervalMs": 600000 }');
    expect(result).toEqual({ status: 'loaded', overrides: { workIntervalMs: 600_000 }, issues: [] });
  });

  it('accepts every known key', () => {
    const result = parseSettings(
      JSON.stringify({
        workIntervalMs: 1_200_000,
        warningMs: 10_000,
        eyeRestMs: 30_000,
        longRestMs: 300_000,
        cyclesBeforeLongRest: 4,
        postponeMs: 120_000,
      }),
    );
    expect(result.status).toBe('loaded');
    expect(result.overrides.cyclesBeforeLongRest).toBe(4);
  });

  it('accepts an empty object', () => {
    expect(parseSettings('{}')).toEqual({ status: 'loaded', overrides: {}, issues: [] });
  });

  it('ignores and reports an unknown key but keeps the valid ones', () => {
    const result = parseSettings('{ "workIntervalMs": 600000, "workInterval": 5 }');
    expect(result.status).toBe('loaded');
    expect(result.overrides).toEqual({ workIntervalMs: 600_000 });
    expect(result.issues).toEqual(['ignored unknown setting "workInterval"']);
  });

  it.each(['', 'not json', '{ "workIntervalMs": ', '{,}'])('rejects invalid JSON: %j', (text) => {
    const result = parseSettings(text);
    expect(result.status).toBe('invalid');
    expect(result.overrides).toEqual({});
    expect(result.issues[0]).toMatch(/not valid JSON/);
  });

  it.each(['[]', 'null', '5', '"text"', 'true'])('rejects a non-object: %s', (text) => {
    expect(parseSettings(text)).toMatchObject({ status: 'invalid', issues: ['must be a JSON object'] });
  });

  it.each([
    ['a string', '{ "workIntervalMs": "20" }'],
    ['null', '{ "postponeMs": null }'],
    ['a boolean', '{ "warningMs": true }'],
  ])('rejects a non-number value (%s) and applies nothing', (_name, text) => {
    const result = parseSettings(text);
    expect(result.status).toBe('invalid');
    expect(result.overrides).toEqual({});
    expect(result.issues[0]).toMatch(/must be a number/);
  });

  it.each([
    ['zero duration', '{ "eyeRestMs": 0 }', /eyeRestMs/],
    ['negative duration', '{ "postponeMs": -1 }', /postponeMs/],
    ['non-integer cycle', '{ "cyclesBeforeLongRest": 2.5 }', /cyclesBeforeLongRest/],
    ['cycle below 1', '{ "cyclesBeforeLongRest": 0 }', /cyclesBeforeLongRest/],
    ['warning not shorter than work', '{ "warningMs": 1200000 }', /warningMs/],
  ])('rejects invalid values: %s', (_name, text, pattern) => {
    const result = parseSettings(text);
    expect(result.status).toBe('invalid');
    expect(result.overrides).toEqual({});
    expect(result.issues[0]).toMatch(pattern);
  });

  it('rejects the whole file when one value is bad, even if others are fine', () => {
    const result = parseSettings('{ "workIntervalMs": 600000, "eyeRestMs": -5 }');
    expect(result.status).toBe('invalid');
    expect(result.overrides).toEqual({});
  });
});

describe('loadSettings', () => {
  it('a missing file means defaults with no issue', () => {
    expect(loadSettings(new FakeSettingsFs(), PATH)).toEqual({
      status: 'missing',
      overrides: {},
      issues: [],
    });
  });

  it('loads an existing file', () => {
    const fs = new FakeSettingsFs();
    fs.files.set(PATH, '{ "postponeMs": 60000 }');
    expect(loadSettings(fs, PATH)).toMatchObject({
      status: 'loaded',
      overrides: { postponeMs: 60_000 },
    });
  });

  it('reports an invalid file instead of throwing', () => {
    const fs = new FakeSettingsFs();
    fs.files.set(PATH, '{ broken');
    expect(loadSettings(fs, PATH).status).toBe('invalid');
  });

  it('reports a read error instead of throwing', () => {
    const fs = new FakeSettingsFs();
    fs.readError = new Error('EACCES: permission denied');
    const result = loadSettings(fs, PATH);
    expect(result.status).toBe('invalid');
    expect(result.issues[0]).toMatch(/EACCES/);
  });
});

describe('saveSettings', () => {
  it('writes a temp file, then renames it over the target', () => {
    const fs = new FakeSettingsFs();
    saveSettings(fs, PATH, { workIntervalMs: 600_000 });

    expect(fs.ops).toEqual([
      'ensureDir /data/eyerest',
      `writeFile ${PATH}.tmp`,
      `rename ${PATH}.tmp ${PATH}`,
    ]);
    expect(fs.files.has(`${PATH}.tmp`)).toBe(false);
  });

  it('round-trips through loadSettings', () => {
    const fs = new FakeSettingsFs();
    saveSettings(fs, PATH, { workIntervalMs: 600_000, cyclesBeforeLongRest: 4 });
    expect(loadSettings(fs, PATH)).toMatchObject({
      status: 'loaded',
      overrides: { workIntervalMs: 600_000, cyclesBeforeLongRest: 4 },
    });
  });

  it('writes nothing when the values are invalid', () => {
    const fs = new FakeSettingsFs();
    expect(() => saveSettings(fs, PATH, { eyeRestMs: -1 })).toThrow(ConfigError);
    expect(fs.ops).toEqual([]);
  });

  it('leaves the original file untouched when the write fails, and cleans up', () => {
    const fs = new FakeSettingsFs();
    fs.files.set(PATH, '{ "postponeMs": 60000 }');
    fs.failOn = 'writeFile';

    expect(() => saveSettings(fs, PATH, { postponeMs: 90_000 })).toThrow('disk full');
    expect(fs.files.get(PATH)).toBe('{ "postponeMs": 60000 }');
    expect(fs.files.has(`${PATH}.tmp`)).toBe(false);
  });

  it('leaves the original file untouched when the rename fails, and cleans up', () => {
    const fs = new FakeSettingsFs();
    fs.files.set(PATH, '{ "postponeMs": 60000 }');
    fs.failOn = 'rename';

    expect(() => saveSettings(fs, PATH, { postponeMs: 90_000 })).toThrow('rename failed');
    expect(fs.files.get(PATH)).toBe('{ "postponeMs": 60000 }');
    expect(fs.files.has(`${PATH}.tmp`)).toBe(false);
  });

  it('works for a Windows-style path', () => {
    const fs = new FakeSettingsFs();
    saveSettings(fs, 'C:\\Users\\a\\settings.json', {});
    expect(fs.ops[0]).toBe('ensureDir C:\\Users\\a');
  });
});
