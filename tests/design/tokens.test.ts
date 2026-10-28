import { describe, expect, it } from 'vitest';
import { isAchromatic, isHex6, isHex8 } from '../../src/design/color';
import {
  colorTokenNames,
  palette,
  resolveToken,
  themes,
} from '../../src/design/tokens';
import type { ThemeName } from '../../src/design/tokens';

const themeNames: readonly ThemeName[] = ['light', 'dark'];

describe('palette', () => {
  it.each(Object.entries(palette))(
    '%s is opaque hex on the black-white axis',
    (_name, hex) => {
      expect(isHex6(hex)).toBe(true);
      expect(isAchromatic(hex)).toBe(true);
    },
  );

  it('has no duplicate values', () => {
    const values = Object.values(palette).map((v) => v.toUpperCase());
    expect(new Set(values).size).toBe(values.length);
  });
});

describe.each(themeNames)('%s theme', (theme) => {
  it('defines every color token and no extras', () => {
    expect(Object.keys(themes[theme]).sort()).toEqual(
      [...colorTokenNames].sort(),
    );
  });

  it.each(colorTokenNames)(
    '%s resolves to a valid achromatic color',
    (name) => {
      const hex = resolveToken(themes[theme][name]);
      expect(isHex6(hex) || isHex8(hex)).toBe(true);
      expect(isAchromatic(hex)).toBe(true);
    },
  );

  it('references only existing palette steps', () => {
    for (const value of Object.values(themes[theme])) {
      if ('ref' in value) expect(palette).toHaveProperty(value.ref);
    }
  });
});

describe('neumorphism contract', () => {
  it.each(themeNames)('%s: surface shares the canvas tone', (theme) => {
    expect(resolveToken(themes[theme].surface)).toBe(
      resolveToken(themes[theme].canvas),
    );
  });

  it.each(themeNames)('%s: shadow-dark is translucent', (theme) => {
    expect(isHex8(resolveToken(themes[theme]['shadow-dark']))).toBe(true);
  });
});
