import { describe, expect, it } from 'vitest';
import { ConfigError, DEFAULT_CONFIG, createConfig } from '../../src/core/config';

describe('createConfig', () => {
  it('returns the spec defaults', () => {
    const config = createConfig();
    expect(config.workIntervalMs).toBe(20 * 60_000);
    expect(config.warningMs).toBe(15_000);
    expect(config.eyeRestMs).toBe(20_000);
    expect(config.longRestMs).toBe(10 * 60_000);
    expect(config.cyclesBeforeLongRest).toBe(3);
    expect(config.postponeMs).toBe(5 * 60_000);
  });

  it('applies overrides on top of defaults', () => {
    const config = createConfig({ eyeRestMs: 30_000 });
    expect(config.eyeRestMs).toBe(30_000);
    expect(config.workIntervalMs).toBe(DEFAULT_CONFIG.workIntervalMs);
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(createConfig())).toBe(true);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid duration %s',
    (bad) => {
      expect(() => createConfig({ eyeRestMs: bad })).toThrow(ConfigError);
      expect(() => createConfig({ postponeMs: bad })).toThrow(ConfigError);
    },
  );

  it.each([0, -2, 1.5])('rejects invalid cyclesBeforeLongRest %s', (bad) => {
    expect(() => createConfig({ cyclesBeforeLongRest: bad })).toThrow(ConfigError);
  });

  it('rejects a warning window that is not shorter than the work interval', () => {
    expect(() => createConfig({ warningMs: 60_000, workIntervalMs: 60_000 })).toThrow(
      ConfigError,
    );
  });
});
