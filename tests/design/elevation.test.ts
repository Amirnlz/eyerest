import { describe, expect, it } from 'vitest';
import {
  buildElevationCss,
  elevationValue,
  elevationVar,
} from '../../src/design/elevation-css';
import { elevationNames, elevations } from '../../src/design/elevation';

const css = buildElevationCss();

describe('elevations', () => {
  it('raised levels grow in offset and blur', () => {
    const raised = elevationNames.filter((n) => n.startsWith('raised-'));
    for (let i = 1; i < raised.length; i++) {
      const prev = elevations[raised[i - 1] as (typeof raised)[number]];
      const next = elevations[raised[i] as (typeof raised)[number]];
      expect(next.offset).toBeGreaterThan(prev.offset);
      expect(next.blur).toBeGreaterThan(prev.blur);
    }
  });

  it.each(elevationNames)(
    '%s: blur is at least the offset (soft edge)',
    (name) => {
      const e = elevations[name];
      expect(e.blur).toBeGreaterThanOrEqual(e.offset);
    },
  );

  it('inset levels are shallower than the smallest raised level', () => {
    expect(elevations['inset-md'].offset).toBeLessThanOrEqual(
      elevations['raised-sm'].offset,
    );
  });
});

describe('elevationValue', () => {
  it.each(elevationNames)(
    '%s: light shadow first up-left, dark second down-right',
    (name) => {
      const value = elevationValue(elevations[name]);
      const [light, dark] = value.split(', ');
      expect(light).toContain('var(--er-color-shadow-light)');
      expect(dark).toContain('var(--er-color-shadow-dark)');
      expect(light).toMatch(/-\d/);
      expect(dark).not.toMatch(/ -\d/);
    },
  );

  it('prefixes both layers of an inset level with inset, and no raised level', () => {
    expect(
      elevationValue(elevations['inset-sm']).match(/inset /g),
    ).toHaveLength(2);
    expect(elevationValue(elevations['raised-sm'])).not.toContain('inset');
  });
});

describe('buildElevationCss', () => {
  it('declares flat and every level in all three theme scopes', () => {
    expect(css.split(`${elevationVar('flat')}: none;`)).toHaveLength(4);
    for (const name of elevationNames) {
      expect(css.split(`${elevationVar(name)}:`)).toHaveLength(4);
    }
  });

  it('never declares on a bare :root (var() would resolve to the light theme)', () => {
    expect(css).not.toMatch(/^:root \{/m);
    expect(css).toMatch(/^:root,\n\[data-theme='light'\] \{/);
    expect(css).toContain("[data-theme='dark'] {");
    expect(css).toContain(':root:not([data-theme])');
  });

  it('takes colors only from color tokens, no literals', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}|rgb|hsl|oklch/i);
  });
});
