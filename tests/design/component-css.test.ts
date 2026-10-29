import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const UI_DIR = join(__dirname, '../../src/renderer/ui');
const files = readdirSync(UI_DIR).filter((f) => f.endsWith('.css'));
const tokens = declaredVars(buildDesignCss());

describe('scanners', () => {
  it('detect raw colors, pixels and unguarded hover', () => {
    expect(rawColorLiterals('a{color:#fff;background:rgb(0 0 0)}')).toHaveLength(2);
    expect(rawColorLiterals('a{color:var(--x)} /* #fff */')).toHaveLength(0);
    expect(rawPixelLengths('a{margin:12px 0}')).toEqual(['12px']);
    expect(rawPixelLengths('a{margin:var(--er-stroke-hairline)}')).toEqual([]);
    expect(hoverOutsideHoverMedia('.a:hover{x:y}')).toEqual(['.a:hover']);
    expect(hoverOutsideHoverMedia('@media (hover: hover){.a:hover{x:y}}')).toEqual([]);
  });
});

describe('component CSS rules', () => {
  it('finds the component stylesheets', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  describe.each(files)('%s', (file) => {
    const css = readFileSync(join(UI_DIR, file), 'utf8');

    it('has no raw color literals', () => {
      expect(rawColorLiterals(css)).toEqual([]);
    });

    it('has no raw pixel lengths', () => {
      expect(rawPixelLengths(css)).toEqual([]);
    });

    it('uses only design tokens that exist', () => {
      const unknown = usedVars(css).filter((name) => name.startsWith('--er-') && !tokens.has(name));
      expect(unknown).toEqual([]);
    });

    it('declares no custom properties of its own', () => {
      expect([...declaredVars(css)]).toEqual([]);
    });

    it('never transitions or will-changes "all"', () => {
      expect(stripComments(css)).not.toMatch(/transition(?:-property)?\s*:[^;]*\ball\b/);
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
