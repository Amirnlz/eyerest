import { describe, expect, it } from 'vitest';
import { buildDesignCss } from '../../src/design/build';
import {
  buildLayoutCss,
  radiusVar,
  spaceVar,
  zIndexVar,
} from '../../src/design/layout-css';
import { radius, space, zIndex } from '../../src/design/layout';

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
});

describe('buildDesignCss', () => {
  it('includes the layout and elevation blocks', () => {
    const all = buildDesignCss();
    expect(all).toContain(css);
    expect(all).toContain('--er-elevation-raised-md:');
    expect(buildDesignCss()).toBe(all);
  });
});
