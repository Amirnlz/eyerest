import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/config';
import { validateSettingsPayload } from '../../src/main/settings/settings-payload';

describe('validateSettingsPayload', () => {
  it('accepts the defaults', () => {
    expect(validateSettingsPayload({ ...DEFAULT_CONFIG })).toEqual({
      ok: true,
      config: DEFAULT_CONFIG,
    });
  });

  it('accepts a full custom config and returns it validated and frozen', () => {
    const result = validateSettingsPayload({
      workIntervalMs: 30 * 60_000,
      warningMs: 30_000,
      eyeRestMs: 40_000,
      longRestMs: 15 * 60_000,
      cyclesBeforeLongRest: 4,
      postponeMs: 2 * 60_000,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.cyclesBeforeLongRest).toBe(4);
      expect(Object.isFrozen(result.config)).toBe(true);
    }
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an array', []],
    ['a number', 5],
    ['a string', '{}'],
  ])('rejects %s', (_name, payload) => {
    expect(validateSettingsPayload(payload)).toEqual({
      ok: false,
      error: 'Settings must be an object.',
    });
  });

  it('rejects a missing key and names it', () => {
    const { postponeMs: _omitted, ...rest } = DEFAULT_CONFIG;
    expect(validateSettingsPayload(rest)).toEqual({ ok: false, error: 'postponeMs is missing.' });
  });

  it('rejects an unknown key and names it', () => {
    expect(validateSettingsPayload({ ...DEFAULT_CONFIG, theme: 'dark' })).toEqual({
      ok: false,
      error: 'Unknown setting "theme".',
    });
  });

  it('rejects a prototype-pollution style key as unknown', () => {
    const payload: unknown = JSON.parse('{ "__proto__": { "workIntervalMs": 1 } }');
    expect(validateSettingsPayload(payload)).toMatchObject({ ok: false });
  });

  it.each([
    ['a numeric string', '1200000'],
    ['null', null],
    ['a boolean', true],
    ['an object', { value: 1 }],
  ])('rejects a non-number value (%s)', (_name, value) => {
    expect(validateSettingsPayload({ ...DEFAULT_CONFIG, eyeRestMs: value })).toEqual({
      ok: false,
      error: 'eyeRestMs must be a number.',
    });
  });

  it.each([
    ['zero duration', { eyeRestMs: 0 }, /eyeRestMs/],
    ['negative duration', { postponeMs: -1 }, /postponeMs/],
    ['NaN', { workIntervalMs: Number.NaN }, /workIntervalMs/],
    ['Infinity', { longRestMs: Number.POSITIVE_INFINITY }, /longRestMs/],
    ['fractional cycle', { cyclesBeforeLongRest: 2.5 }, /cyclesBeforeLongRest/],
    ['cycle below 1', { cyclesBeforeLongRest: 0 }, /cyclesBeforeLongRest/],
    ['warning equal to work', { warningMs: DEFAULT_CONFIG.workIntervalMs }, /warningMs/],
  ])('rejects the config rule: %s', (_name, override, pattern) => {
    const result = validateSettingsPayload({ ...DEFAULT_CONFIG, ...override });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(pattern);
  });

  it('accepts warning one millisecond shorter than work (boundary)', () => {
    const result = validateSettingsPayload({
      ...DEFAULT_CONFIG,
      warningMs: DEFAULT_CONFIG.workIntervalMs - 1,
    });
    expect(result.ok).toBe(true);
  });
});
