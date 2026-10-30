import { describe, expect, it } from 'vitest';
import { buildDesignCss } from '../../src/design/build';
import {
  buildLayoutCss,
  opacityVar,
  opticalVar,
  radiusVar,
  spaceVar,
  strokeVar,
  zIndexVar,
} from '../../src/design/layout-css';
import { opacity, radius, space, stroke, zIndex } from '../../src/design/layout';

const css = buildLayoutCss();

describe('buildLayoutCss', () => {
  it('declares every space, radius and z-index token once with the right value', () => {
    for (const [k, v] of Object.entries(space)) {
      const name = Number(k) as keyof typeof space;
      expect(css.split(`${spaceVar(name)}:`)).toHaveLength(2);
      expect(css).toContain(`${spaceVar(name)}: ${v}rem;`);
    }
    for (const [k, v] of Object.entries(radius)) {
      expect(css).toContain(`${radiusVar(k as keyof typeof radius)}: ${v}rem;`);
    }
    for (const [k, v] of Object.entries(zIndex)) {
      expect(css).toContain(`${zIndexVar(k as keyof typeof zIndex)}: ${v};`);
    }
    expect(css).toContain('--er-radius-full: 9999px;');
  });

  it('declares the optical nudge once, in rem', () => {
    expect(css).toContain('--er-optical-nudge: 0.125rem;');
    expect(css.split(`${opticalVar('nudge')}:`)).toHaveLength(2);
  });

  it('declares stroke and opacity tokens with exact values', () => {
    expect(css).toContain('--er-stroke-hairline: 1px;');
    expect(css).toContain('--er-stroke-focus: 2px;');
    expect(css).toContain('--er-stroke-focus-offset: 3px;');
    expect(css).toContain('--er-opacity-disabled: 0.5;');
    for (const name of Object.keys(stroke) as (keyof typeof stroke)[]) {
      expect(css.split(`${strokeVar(name)}:`)).toHaveLength(2);
    }
    for (const name of Object.keys(opacity) as (keyof typeof opacity)[]) {
      expect(css.split(`${opacityVar(name)}:`)).toHaveLength(2);
    }
  });
});

describe('buildDesignCss', () => {
  it('includes the layout and elevation blocks', () => {
    const all = buildDesignCss();
    expect(all).toContain(css);
    expect(all).toContain('--er-elevation-raised-md:');
    expect(buildDesignCss()).toBe(all);
  });
});
