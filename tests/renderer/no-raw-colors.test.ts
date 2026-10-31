import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rawColorLiterals, stripComments } from '../helpers/css-scan';

/**
 * The CSS scanner covers stylesheets only. This covers the TS and TSX style objects (violation V3):
 * no color literal may appear in renderer code. Colors come from `--er-color-*` through CSS.
 */

const RENDERER = join(__dirname, '../../src/renderer');
const SKIP_DIRS = new Set(['assets']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

describe('renderer code has no raw colors', () => {
  it.each(sourceFiles(RENDERER))('%s', (file) => {
    expect(rawColorLiterals(stripComments(readFileSync(file, 'utf8')))).toEqual([]);
  });

  it('flags a raw color in a style object (guard against a blind scanner)', () => {
    expect(rawColorLiterals("const s = { background: 'rgba(0, 0, 0, 0.5)' };")).toHaveLength(1);
    expect(rawColorLiterals("const s = { color: '#fff' };")).toHaveLength(1);
    expect(rawColorLiterals("const s = { color: 'var(--er-color-scrim)' };")).toEqual([]);
  });
});
