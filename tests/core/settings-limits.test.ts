import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, createConfig, type RestConfig } from '../../src/core/config';
import { LIMIT_FACTOR, SETTINGS_LIMITS, isWithinLimits } from '../../src/core/settings-limits';

const keys = Object.keys(DEFAULT_CONFIG) as (keyof RestConfig)[];

describe('SETTINGS_LIMITS', () => {
  it('has a limit for every config field', () => {
    expect(Object.keys(SETTINGS_LIMITS).sort()).toEqual([...keys].sort());
  });

  it.each(keys)('%s runs from half to twice its default', (key) => {
    expect(SETTINGS_LIMITS[key]).toEqual({
      min: DEFAULT_CONFIG[key] / LIMIT_FACTOR,
      max: DEFAULT_CONFIG[key] * LIMIT_FACTOR,
    });
  });

  it.each(keys)('%s contains its own default', (key) => {
    expect(isWithinLimits(key, DEFAULT_CONFIG[key])).toBe(true);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(SETTINGS_LIMITS)).toBe(true);
  });

  it('keeps the largest warning shorter than the smallest work interval', () => {
    // The settings form relies on this: it never needs a warning-versus-work error.
    expect(SETTINGS_LIMITS.warningMs.max).toBeLessThan(SETTINGS_LIMITS.workIntervalMs.min);
  });

  it('every value at either end of every limit passes createConfig', () => {
    for (const key of keys) {
      const { min, max } = SETTINGS_LIMITS[key];
      // A count must be whole to be valid; the other fields take the exact end.
      const ends = key === 'cyclesBeforeLongRest' ? [Math.ceil(min), Math.floor(max)] : [min, max];
      for (const value of ends) {
        const overrides: Partial<Record<keyof RestConfig, number>> = {};
        overrides[key] = value;
        expect(() => createConfig(overrides), `${key}=${value}`).not.toThrow();
      }
    }
  });
});

describe('isWithinLimits', () => {
  it('includes both ends and excludes just outside', () => {
    const { min, max } = SETTINGS_LIMITS.eyeRestMs;
    expect(isWithinLimits('eyeRestMs', min)).toBe(true);
    expect(isWithinLimits('eyeRestMs', max)).toBe(true);
    expect(isWithinLimits('eyeRestMs', min - 1)).toBe(false);
    expect(isWithinLimits('eyeRestMs', max + 1)).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1])(
    'rejects %s',
    (value) => {
      expect(isWithinLimits('workIntervalMs', value)).toBe(false);
    },
  );
});
