import { describe, expect, it } from 'vitest';
import { buildDesignCss } from '../../src/design/build';
import { themedBlocks } from '../../src/design/theme-scope';

describe('themedBlocks', () => {
  const css = themedBlocks((theme, indent) => [`${indent}--x: ${theme};`]);

  it('emits light default, forced dark, and OS dark scopes in that order', () => {
    const light = css.indexOf('--x: light;');
    const dark = css.indexOf('--x: dark;');
    const os = css.indexOf('prefers-color-scheme: dark');
    expect(light).toBeGreaterThan(-1);
    expect(dark).toBeGreaterThan(light);
    expect(os).toBeGreaterThan(dark);
    expect(css.match(/--x: dark;/g)).toHaveLength(2);
  });
});

describe('full stylesheet', () => {
  it('never uses theme color variables inside a theme-independent :root block', () => {
    const blocks = buildDesignCss().split(/\n\n/);
    const bareRoot = blocks.filter((b) => b.startsWith(':root {'));
    expect(bareRoot.length).toBeGreaterThan(0);
    for (const block of bareRoot) {
      expect(block).not.toContain('var(--er-color-');
    }
  });
});
