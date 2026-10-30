import { describe, expect, it } from 'vitest';
import { buildColorCss, cssVarName } from '../../src/design/css';
import { colorTokenNames, resolveToken, themes } from '../../src/design/tokens';

const css = buildColorCss();

describe('buildColorCss', () => {
  it.each(colorTokenNames)(
    'declares %s in light, dark and the media query',
    (name) => {
      const occurrences = css.split(`${cssVarName(name)}:`).length - 1;
      expect(occurrences).toBe(3);
    },
  );

  it('emits the resolved value for each theme', () => {
    for (const name of colorTokenNames) {
      expect(css).toContain(
        `${cssVarName(name)}: ${resolveToken(themes.light[name])};`,
      );
      expect(css).toContain(
        `${cssVarName(name)}: ${resolveToken(themes.dark[name])};`,
      );
    }
  });

  it('emits the image outline as black at 10% for light and white at 10% for dark', () => {
    expect(css).toContain('--er-color-image-outline: #0000001A;');
    expect(css).toContain('--er-color-image-outline: #FFFFFF1A;');
  });

  it('uses light as default and honors an explicit data-theme over the OS preference', () => {
    expect(css).toMatch(/^:root,\n\[data-theme='light'\] \{/);
    expect(css).toContain("[data-theme='dark'] {");
    expect(css).toContain(':root:not([data-theme])');
    const dataDark = css.indexOf("[data-theme='dark']");
    expect(css.indexOf('prefers-color-scheme: dark')).toBeGreaterThan(dataDark);
  });

  it('sets color-scheme per theme', () => {
    expect(css.match(/color-scheme: light;/g)).toHaveLength(1);
    expect(css.match(/color-scheme: dark;/g)).toHaveLength(2);
  });

  it('is deterministic and ends with a newline', () => {
    expect(buildColorCss()).toBe(css);
    expect(css.endsWith('\n')).toBe(true);
  });

  it('contains no chromatic color functions', () => {
    expect(css).not.toMatch(/hsl|oklch|rgb\(/i);
  });
});
