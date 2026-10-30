import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDesignCss } from '../../src/design/build';
import {
  declaredVars,
  hoverOutsideHoverMedia,
  rawColorLiterals,
  rawPixelLengths,
  stripComments,
  usedVars,
} from '../helpers/css-scan';

/** Every stylesheet that ships with a renderer component: primitives and overlay components. */
const STYLE_DIRS = ['ui', 'components'].map((d) => join(__dirname, '../../src/renderer', d));
const files = STYLE_DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => join(dir, f)),
);
const tokens = declaredVars(buildDesignCss());

/** Component-scoped variables: `Surface.css` may declare `--er-surface-*`, and others may read them. */
const componentVars = new Set(
  files.flatMap((f) => [...declaredVars(readFileSync(f, 'utf8'))]),
);

describe('scanners', () => {
  it('detect raw colors, pixels and unguarded hover', () => {
    expect(
      rawColorLiterals('a{color:#fff;background:rgb(0 0 0)}'),
    ).toHaveLength(2);
    expect(rawColorLiterals('a{color:var(--x)} /* #fff */')).toHaveLength(0);
    expect(rawPixelLengths('a{margin:12px 0}')).toEqual(['12px']);
    expect(rawPixelLengths('a{margin:var(--er-stroke-hairline)}')).toEqual([]);
    expect(hoverOutsideHoverMedia('.a:hover{x:y}')).toEqual(['.a:hover']);
    expect(
      hoverOutsideHoverMedia('@media (hover: hover){.a:hover{x:y}}'),
    ).toEqual([]);
  });
});

describe('component CSS rules', () => {
  it('finds the component stylesheets, overlay components included', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.map((f) => basename(f))).toContain('OverlayPanel.css');
  });

  describe.each(files.map((f) => [basename(f), f] as const))('%s', (name, path) => {
    const css = readFileSync(path, 'utf8');

    it('has no raw color literals', () => {
      expect(rawColorLiterals(css)).toEqual([]);
    });

    it('has no raw pixel lengths', () => {
      expect(rawPixelLengths(css)).toEqual([]);
    });

    it('uses only design tokens that exist', () => {
      const unknown = usedVars(css).filter(
        (name) =>
          name.startsWith('--er-') &&
          !tokens.has(name) &&
          !componentVars.has(name),
      );
      expect(unknown).toEqual([]);
    });

    it('declares only custom properties scoped to its own component', () => {
      const prefix = `--er-${name.replace(/\.css$/, '').toLowerCase()}-`;
      const foreign = [...declaredVars(css)].filter(
        (name) => !name.startsWith(prefix),
      );
      expect(foreign).toEqual([]);
    });

    it('never shadows a design token with a component variable', () => {
      const shadowing = [...declaredVars(css)].filter((name) =>
        tokens.has(name),
      );
      expect(shadowing).toEqual([]);
    });

    it('never transitions or will-changes "all"', () => {
      expect(stripComments(css)).not.toMatch(
        /transition(?:-property)?\s*:[^;]*\ball\b/,
      );
      expect(stripComments(css)).not.toMatch(/will-change\s*:[^;]*\ball\b/);
    });

    it('never uses !important', () => {
      expect(stripComments(css)).not.toContain('!important');
    });

    it('guards :hover behind (hover: hover)', () => {
      expect(hoverOutsideHoverMedia(css)).toEqual([]);
    });
  });
});
