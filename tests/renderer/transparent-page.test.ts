import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDesignCss } from '../../src/design/build';

/**
 * The overlay window is transparent (src/main/overlay/window-background.ts). It stays see-through
 * only if no stylesheet paints the page itself: a `background` on html, body, :root or #root would
 * show as a rectangle around the rounded panel. Panels paint through `Surface` only.
 */

const PAGE_SELECTOR = /^(html|body|:root|#root|\[data-theme[^\]]*\])$/;

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

/** Declared properties of every top-level rule whose selector list targets the page itself. */
function pagePaintingRules(css: string): string[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const hits: string[] = [];
  for (const [, selectorList = '', body = ''] of rules) {
    const targetsPage = selectorList
      .split(',')
      .map((selector) => selector.trim())
      .some((selector) => PAGE_SELECTOR.test(selector));
    if (targetsPage && /(^|[;\s])background(-color|-image)?\s*:/.test(body)) {
      hits.push(selectorList.trim());
    }
  }
  return hits;
}

describe('overlay page stays transparent', () => {
  it('the generated design CSS paints no background on the page', () => {
    expect(pagePaintingRules(buildDesignCss())).toEqual([]);
  });

  it.each(cssFiles(join(__dirname, '../../src/renderer')))(
    '%s paints no background on the page',
    (file) => {
      expect(pagePaintingRules(readFileSync(file, 'utf8'))).toEqual([]);
    },
  );

  it('detects a page background (guard against a blind scanner)', () => {
    expect(pagePaintingRules('body { background: red; }')).toEqual(['body']);
    expect(pagePaintingRules(':root,\n[data-theme=\'light\'] { background-color: #fff; }')).toEqual([
      ':root,\n[data-theme=\'light\']',
    ]);
    expect(pagePaintingRules('.er-surface { background-color: red; }')).toEqual([]);
  });
});
