import { describe, expect, it } from 'vitest';
import { buildDesignCss } from '../../src/design/build';
import {
  DESIGN_CSS_MODULE_ID,
  designCssPlugin,
} from '../../src/design/vite-plugin';

describe('designCssPlugin', () => {
  const plugin = designCssPlugin();

  it('has a stable name', () => {
    expect(plugin.name).toBe('eyerest-design-css');
  });

  it('resolves only the virtual id, to a \\0-prefixed internal id', () => {
    const resolved = plugin.resolveId(DESIGN_CSS_MODULE_ID);
    expect(resolved).toBe(`\0${DESIGN_CSS_MODULE_ID}`);
    expect(plugin.resolveId('./other.css')).toBeUndefined();
    expect(plugin.resolveId('react')).toBeUndefined();
  });

  it('loads the full generated stylesheet for the resolved id', () => {
    const resolved = plugin.resolveId(DESIGN_CSS_MODULE_ID) ?? '';
    expect(plugin.load(resolved)).toBe(buildDesignCss());
  });

  it('does not load unrelated ids, including the unresolved virtual id', () => {
    expect(plugin.load('/src/App.tsx')).toBeUndefined();
    expect(plugin.load(DESIGN_CSS_MODULE_ID)).toBeUndefined();
  });

  it('ends the virtual id in .css so Vite runs it through the CSS pipeline', () => {
    expect(DESIGN_CSS_MODULE_ID.endsWith('.css')).toBe(true);
  });
});
