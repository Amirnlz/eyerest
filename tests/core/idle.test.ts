import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IDLE_CONFIG,
  IdleConfigError,
  createIdleConfig,
  decideIdle,
} from '../../src/core/idle';
import type { Phase } from '../../src/core/state';

const T = 60_000;
const decide = (phase: Phase, idleMs: number) => decideIdle({ phase, idleMs, thresholdMs: T });

describe('decideIdle', () => {
  it('goes away from working at exactly the threshold, not before', () => {
    expect(decide('working', T - 1)).toBeNull();
    expect(decide('working', T)).toBe('away');
    expect(decide('working', T * 10)).toBe('away');
  });

  it('comes back from away as soon as idle time drops under the threshold', () => {
    expect(decide('away', T)).toBeNull();
    expect(decide('away', T + 1)).toBeNull();
    expect(decide('away', T - 1)).toBe('back');
    expect(decide('away', 0)).toBe('back');
  });

  it.each(['idle', 'warning', 'resting'] as const)('never acts during %s', (phase) => {
    expect(decide(phase, 0)).toBeNull();
    expect(decide(phase, T * 10)).toBeNull();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])('ignores the unusable reading %s', (reading) => {
    expect(decide('working', reading)).toBeNull();
    expect(decide('away', reading)).toBeNull();
  });
});

describe('createIdleConfig', () => {
  it('defaults to a one minute threshold', () => {
    expect(createIdleConfig()).toEqual({ thresholdMs: 60_000 });
    expect(DEFAULT_IDLE_CONFIG.thresholdMs).toBe(60_000);
  });

  it('accepts an override and returns a frozen object', () => {
    const config = createIdleConfig({ thresholdMs: 3_000 });
    expect(config.thresholdMs).toBe(3_000);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (thresholdMs) => {
    expect(() => createIdleConfig({ thresholdMs })).toThrow(IdleConfigError);
  });
});
