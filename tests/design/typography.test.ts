import { describe, expect, it } from 'vitest';
import {
  fontFamilies,
  fontWeights,
  typeRoleNames,
  typeRoles,
} from '../../src/design/typography';

describe('font families', () => {
  it('ends every stack with a generic family', () => {
    for (const stack of Object.values(fontFamilies)) {
      expect(stack.trim().endsWith('sans-serif')).toBe(true);
    }
  });

  it('references no remote URL (CSP is default-src self)', () => {
    for (const stack of Object.values(fontFamilies)) {
      expect(stack).not.toMatch(/url\(|https?:/i);
    }
  });
});

describe('type roles', () => {
  it('defines exactly the declared roles', () => {
    expect(Object.keys(typeRoles).sort()).toEqual([...typeRoleNames].sort());
  });

  it('descends strictly in size: display > title > body > label > caption', () => {
    const sizes = typeRoleNames.map((r) => typeRoles[r].size);
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i - 1]).toBeGreaterThan(
        sizes[i] ?? Number.POSITIVE_INFINITY,
      );
    }
  });

  it.each(typeRoleNames)('%s: readable minimums', (role) => {
    const t = typeRoles[role];
    expect(t.size).toBeGreaterThanOrEqual(0.75);
    expect(t.lineHeight).toBeGreaterThanOrEqual(1);
    expect(Object.keys(fontWeights)).toContain(t.weight);
  });

  it('body line height is at least 1.5 (WCAG 1.4.12 text spacing)', () => {
    expect(typeRoles.body.lineHeight).toBeGreaterThanOrEqual(1.5);
  });

  it('only the countdown role uses tabular numerals', () => {
    const tabular = typeRoleNames.filter((r) => typeRoles[r].tabularNums);
    expect(tabular).toEqual(['display']);
  });

  it('never tracks text outward by more than 0.02em (no spaced caps)', () => {
    for (const role of typeRoleNames) {
      expect(typeRoles[role].letterSpacing).toBeLessThanOrEqual(0.02);
    }
  });

  it('tightens only large text', () => {
    for (const role of typeRoleNames) {
      if (typeRoles[role].letterSpacing < 0) {
        expect(typeRoles[role].size).toBeGreaterThanOrEqual(1.25);
      }
    }
  });
});
