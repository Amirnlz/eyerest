import { describe, expect, it } from 'vitest';
import {
  durations,
  easings,
  effectNames,
  effects,
  reducedEffects,
} from '../../src/design/motion';

describe('durations', () => {
  it('ascends: fast < quick < base', () => {
    expect(durations.fast).toBeLessThan(durations.quick);
    expect(durations.quick).toBeLessThan(durations.base);
  });

  it('keeps high-frequency feedback at or below 150ms', () => {
    expect(durations.fast).toBeLessThanOrEqual(150);
    expect(durations.quick).toBeLessThanOrEqual(150);
  });
});

describe('easings', () => {
  it('uses the exact better-ui curves', () => {
    expect(easings.out).toBe('ease-out');
    expect(easings.standard).toBe('cubic-bezier(0.2, 0, 0, 1)');
  });

  it('has no overshoot or bounce curve (y values stay within 0..1)', () => {
    const match = /cubic-bezier\(([^)]+)\)/.exec(easings.standard);
    const [, y1, , y2] = (match?.[1] ?? '').split(',').map(Number);
    expect(y1).toBeGreaterThanOrEqual(0);
    expect(y2).toBeLessThanOrEqual(1);
  });
});

describe('effects', () => {
  it('press scale is exactly 0.96', () => {
    expect(effects.pressScale).toBe(0.96);
  });

  it('enter moves up 12px with 4px blur, staggered 100ms', () => {
    expect(effects.enterOffset * 16).toBe(12);
    expect(effects.blur * 16).toBe(4);
    expect(effects.stagger).toBe(100);
  });

  it('exits are fixed, opposite in direction, and no larger than the enter', () => {
    expect(effects.exitOffset).toBeLessThan(0);
    expect(Math.abs(effects.exitOffset)).toBeLessThanOrEqual(
      effects.enterOffset,
    );
    expect(durations.quick).toBeLessThan(durations.base);
  });
});

describe('reducedEffects', () => {
  it('covers exactly the same effects', () => {
    expect(Object.keys(reducedEffects).sort()).toEqual([...effectNames].sort());
  });

  it('neutralises movement, scale and blur', () => {
    expect(reducedEffects.pressScale).toBe(1);
    expect(reducedEffects.enterOffset).toBe(0);
    expect(reducedEffects.exitOffset).toBe(0);
    expect(reducedEffects.blur).toBe(0);
  });

  it('leaves timing untouched so the opacity fade still plays', () => {
    expect(reducedEffects.stagger).toBe(effects.stagger);
  });
});
