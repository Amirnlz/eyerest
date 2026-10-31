import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripComments } from '../helpers/css-scan';

/**
 * Timing lives in the motion tokens (src/design/motion.ts). A stylesheet that writes its own
 * duration or easing drifts from the rest of the app, as the dim fade did (200 ms, no token).
 * Zero is allowed: `0ms` is "no delay", not a timing choice.
 */

const RENDERER = join(__dirname, '../../src/renderer');

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

const RAW_TIME = /(?<![\w.-])(?:[1-9]\d*|\d*\.\d*[1-9]\d*)\s?m?s\b/g;
const RAW_EASING = /\bcubic-bezier\(|\bsteps\(|(?<![\w-])ease(?:-in|-out|-in-out)?(?![\w-])/g;

describe('renderer stylesheets use motion tokens only', () => {
  it.each(cssFiles(RENDERER))('%s', (file) => {
    const css = stripComments(readFileSync(file, 'utf8'));
    expect(css.match(RAW_TIME) ?? [], 'raw duration').toEqual([]);
    expect(css.match(RAW_EASING) ?? [], 'raw easing').toEqual([]);
  });

  it('flags a raw duration and a raw easing (guard against a blind scanner)', () => {
    expect('transition: opacity 200ms ease-out;'.match(RAW_TIME)).toHaveLength(1);
    expect('transition: opacity 200ms ease-out;'.match(RAW_EASING)).toHaveLength(1);
    expect('animation-delay: 0ms;'.match(RAW_TIME)).toBeNull();
    expect('transition-duration: var(--er-duration-quick);'.match(RAW_TIME)).toBeNull();
    expect('transition-timing-function: var(--er-ease-out);'.match(RAW_EASING)).toBeNull();
    expect('transition: opacity 1.5s;'.match(RAW_TIME)).toHaveLength(1);
  });
});
