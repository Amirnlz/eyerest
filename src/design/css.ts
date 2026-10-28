import { themedBlocks } from './theme-scope';
import { colorTokenNames, resolveToken, themes } from './tokens';
import type { ColorTokenName, ThemeName } from './tokens';

export const CSS_PREFIX = 'er';

export function cssVarName(name: ColorTokenName): string {
  return `--${CSS_PREFIX}-color-${name}`;
}

/**
 * Theme selection:
 * - `data-theme="light|dark"` on any ancestor forces a theme.
 * - With no attribute, the OS preference decides; light is the default.
 */
export function buildColorCss(): string {
  return themedBlocks((theme: ThemeName, indent: string) => [
    `${indent}color-scheme: ${theme};`,
    ...colorTokenNames.map(
      (name) => `${indent}${cssVarName(name)}: ${resolveToken(themes[theme][name])};`,
    ),
  ]);
}
