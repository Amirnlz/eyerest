import { describe, expect, it } from 'vitest';
import { EXERCISE_IDS, exerciseAt, exerciseIndex } from '../../../src/renderer/exercise/exercises';

describe('exerciseIndex', () => {
  it('splits a 20 s rest into three steps by elapsed time', () => {
    // part = 6.667 s: steps change at 6.67 s and 13.33 s elapsed.
    const at = (left: number) => exerciseIndex(left, 20);
    expect([at(20), at(15), at(14)]).toEqual([0, 0, 0]);
    expect([at(13), at(10), at(7)]).toEqual([1, 1, 1]);
    expect([at(6), at(3), at(1), at(0)]).toEqual([2, 2, 2, 2]);
  });

  it('splits the 5 s fast rest as 0-1, 2-3 and 4', () => {
    const at = (left: number) => exerciseIndex(left, 5);
    expect([5, 4].map(at)).toEqual([0, 0]);
    expect([3, 2].map(at)).toEqual([1, 1]);
    expect([1, 0].map(at)).toEqual([2, 2]);
  });

  it('never leaves the valid range', () => {
    for (let left = -5; left <= 30; left += 1) {
      const index = exerciseIndex(left, 20);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(EXERCISE_IDS.length);
    }
  });

  it('falls back to the first exercise for unusable numbers', () => {
    expect(exerciseIndex(10, 0)).toBe(0);
    expect(exerciseIndex(10, -1)).toBe(0);
    expect(exerciseIndex(Number.NaN, 20)).toBe(0);
    expect(exerciseIndex(10, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('shows the first exercise for a rest that reports more time left than its total', () => {
    expect(exerciseIndex(25, 20)).toBe(0);
  });
});

describe('exerciseAt', () => {
  it('runs look far, roll, blink in order', () => {
    expect([20, 10, 2].map((left) => exerciseAt(left, 20))).toEqual(['look-far', 'roll', 'blink']);
  });
});
