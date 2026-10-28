import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../src/design/color';
import { contrastPairs, resolveToken, themes } from '../../src/design/tokens';
import type { ThemeName } from '../../src/design/tokens';

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#808080', '#808080')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    const forward = contrastRatio('#1A1A1A', '#E3E3E3');
    expect(forward).toBeCloseTo(contrastRatio('#E3E3E3', '#1A1A1A'), 10);
  });

  it('rejects translucent input', () => {
    expect(() => contrastRatio('#00000066', '#FFFFFF')).toThrow();
  });
});

describe.each(['light', 'dark'] as const satisfies readonly ThemeName[])(
  '%s WCAG AA',
  (theme) => {
    it.each(contrastPairs)('$foreground on $background ($use)', (pair) => {
      const fg = resolveToken(themes[theme][pair.foreground]);
      const bg = resolveToken(themes[theme][pair.background]);
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(pair.minRatio);
    });
  },
);
