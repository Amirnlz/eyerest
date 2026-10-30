import { describe, expect, it } from 'vitest';
import { spokenDuration } from '../../src/renderer/spoken-duration';

describe('spokenDuration', () => {
  it.each([
    [0, '0 seconds'],
    [1, '1 second'],
    [2, '2 seconds'],
    [15, '15 seconds'],
    [59, '59 seconds'],
    [60, '1 minute'],
    [61, '1 minute 1 second'],
    [90, '1 minute 30 seconds'],
    [120, '2 minutes'],
    [600, '10 minutes'],
    [605, '10 minutes 5 seconds'],
  ])('%i seconds is "%s"', (input, expected) => {
    expect(spokenDuration(input)).toBe(expected);
  });

  it.each([-5, Number.NaN, Number.POSITIVE_INFINITY])('treats %s as zero', (input) => {
    expect(spokenDuration(input)).toBe('0 seconds');
  });

  it('rounds fractions down, like the countdown', () => {
    expect(spokenDuration(19.9)).toBe('19 seconds');
  });
});
