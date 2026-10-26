import { describe, expect, it } from 'vitest';
import { formatCountdown } from '../../src/renderer/format-countdown';

describe('formatCountdown', () => {
  it.each([
    [20, '20'],
    [15, '15'],
    [1, '1'],
    [0, '0'],
    [59, '59'],
  ])('shows %i seconds as plain seconds: %s', (input, expected) => {
    expect(formatCountdown(input)).toBe(expected);
  });

  it.each([
    [60, '1:00'],
    [61, '1:01'],
    [599, '9:59'],
    [600, '10:00'],
    [3661, '61:01'],
  ])('shows %i seconds as m:ss: %s', (input, expected) => {
    expect(formatCountdown(input)).toBe(expected);
  });

  it('floors fractional seconds', () => {
    expect(formatCountdown(19.9)).toBe('19');
    expect(formatCountdown(60.5)).toBe('1:00');
  });

  it.each([-5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'shows invalid input %s as 0',
    (input) => {
      expect(formatCountdown(input)).toBe('0');
    },
  );
});
