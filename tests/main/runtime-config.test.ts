import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/config';
import { FAST_MODE_CONFIG, resolveConfig } from '../../src/main/runtime-config';

describe('resolveConfig', () => {
  it('uses the spec defaults when no env flag is set', () => {
    expect(resolveConfig({})).toEqual(DEFAULT_CONFIG);
  });

  it('uses fast mode when EYEREST_FAST=1', () => {
    const config = resolveConfig({ EYEREST_FAST: '1' });
    expect(config.workIntervalMs).toBe(20_000);
    expect(config.warningMs).toBe(5_000);
    expect(config.eyeRestMs).toBe(5_000);
    expect(config.longRestMs).toBe(10_000);
    expect(config.postponeMs).toBe(10_000);
    expect(config.cyclesBeforeLongRest).toBe(DEFAULT_CONFIG.cyclesBeforeLongRest);
  });

  it.each(['0', '', 'true', 'yes', undefined])('ignores EYEREST_FAST=%s', (value) => {
    expect(resolveConfig({ EYEREST_FAST: value })).toEqual(DEFAULT_CONFIG);
  });

  it('fast mode values pass config validation', () => {
    expect(() => resolveConfig({ EYEREST_FAST: '1' })).not.toThrow();
    expect(FAST_MODE_CONFIG.warningMs).toBeLessThan(FAST_MODE_CONFIG.workIntervalMs ?? 0);
  });

  describe('settings overrides', () => {
    it('applies the settings file on top of the defaults', () => {
      const config = resolveConfig({}, { workIntervalMs: 600_000, cyclesBeforeLongRest: 4 });
      expect(config.workIntervalMs).toBe(600_000);
      expect(config.cyclesBeforeLongRest).toBe(4);
      expect(config.eyeRestMs).toBe(DEFAULT_CONFIG.eyeRestMs);
    });

    it('EYEREST_FAST wins over the settings file for the durations it sets', () => {
      const config = resolveConfig({ EYEREST_FAST: '1' }, { workIntervalMs: 600_000, cyclesBeforeLongRest: 4 });
      expect(config.workIntervalMs).toBe(20_000);
      expect(config.cyclesBeforeLongRest).toBe(4);
    });

    it('still validates the merged result', () => {
      expect(() => resolveConfig({}, { eyeRestMs: -1 })).toThrow();
    });
  });
});
