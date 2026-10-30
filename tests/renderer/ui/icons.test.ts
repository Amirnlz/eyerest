import { describe, expect, it } from 'vitest';
import { ICON_GRID, iconNames, icons } from '../../../src/renderer/ui/icons';

const PATH_CHARS = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-., ]+$/;

describe('icon registry', () => {
  it('defines exactly the declared names', () => {
    expect(Object.keys(icons).sort()).toEqual([...iconNames].sort());
  });

  it('has unique names', () => {
    expect(new Set(iconNames).size).toBe(iconNames.length);
  });

  it.each(iconNames)('%s has at least one shape', (name) => {
    expect(icons[name].shapes.length).toBeGreaterThan(0);
  });

  it.each(iconNames)(
    '%s uses only SVG path characters and no colors',
    (name) => {
      for (const shape of icons[name].shapes) {
        if (shape.kind === 'path') {
          expect(shape.d).toMatch(PATH_CHARS);
          expect(shape.d).not.toContain('#');
        }
      }
    },
  );

  it.each(iconNames)('%s circles sit inside the grid', (name) => {
    for (const shape of icons[name].shapes) {
      if (shape.kind === 'circle') {
        expect(shape.r).toBeGreaterThan(0);
        expect(shape.cx - shape.r).toBeGreaterThanOrEqual(0);
        expect(shape.cy - shape.r).toBeGreaterThanOrEqual(0);
        expect(shape.cx + shape.r).toBeLessThanOrEqual(ICON_GRID);
        expect(shape.cy + shape.r).toBeLessThanOrEqual(ICON_GRID);
      }
    }
  });

  it('mirrors only direction-bound icons in RTL', () => {
    const mirrored = iconNames.filter((n) => icons[n].mirrorInRtl);
    expect(mirrored).toEqual(['skip']);
  });

  it.each(['eye', 'sun', 'moon', 'skip'] as const)(
    '%s has a fill variant (a fillable shape)',
    (name) => {
      expect(icons[name].shapes.some((s) => s.fillable === true)).toBe(true);
    },
  );

  it('postpone has no fill variant, so a filled clock never hides its hands', () => {
    expect(icons.postpone.shapes.some((s) => s.fillable === true)).toBe(false);
  });
});
