import { describe, expect, it } from 'vitest';
import { designFonts } from '../../src/design/fonts';
import { fontFamilies, fontWeights } from '../../src/design/typography';

describe('designFonts', () => {
  it.each(designFonts)(
    '$family is the first family of the sans stack',
    (font) => {
      expect(fontFamilies.sans.startsWith(`'${font.family}'`)).toBe(true);
    },
  );

  it.each(designFonts)(
    '$family covers every weight the type scale uses',
    (font) => {
      const [min, max] = font.weight.split(' ').map(Number);
      for (const weight of Object.values(fontWeights)) {
        expect(weight).toBeGreaterThanOrEqual(min ?? Number.POSITIVE_INFINITY);
        expect(weight).toBeLessThanOrEqual(max ?? Number.NEGATIVE_INFINITY);
      }
    },
  );

  it.each(designFonts)(
    '$family points at a woff2 file name, not a path or URL',
    (font) => {
      expect(font.file).toMatch(/^[A-Za-z0-9._-]+\.woff2$/);
    },
  );

  it('has unique families and files', () => {
    expect(new Set(designFonts.map((f) => f.family)).size).toBe(
      designFonts.length,
    );
    expect(new Set(designFonts.map((f) => f.file)).size).toBe(
      designFonts.length,
    );
  });
});
