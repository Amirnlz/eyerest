import { describe, expect, it } from 'vitest';
import { radius, space, zIndex } from '../../src/design/layout';

describe('space', () => {
  it('ascends strictly', () => {
    const values = Object.values(space);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(
        values[i - 1] ?? Number.POSITIVE_INFINITY,
      );
    }
  });

  it.each(Object.entries(space))(
    'step %s stays on the 4px grid (0.25rem multiples)',
    (_k, v) => {
      expect(Number.isInteger(v / 0.25)).toBe(true);
    },
  );

  it('anchors the scale: space-4 is 1rem, space-8 is 2rem', () => {
    expect(space[4]).toBe(1);
    expect(space[8]).toBe(2);
  });
});

describe('radius', () => {
  it('ascends strictly', () => {
    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.lg);
  });
});

describe('zIndex', () => {
  it('orders base < raised < overlay', () => {
    expect(zIndex.base).toBeLessThan(zIndex.raised);
    expect(zIndex.raised).toBeLessThan(zIndex.overlay);
  });
});
