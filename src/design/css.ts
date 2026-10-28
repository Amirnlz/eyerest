import { colorTokenNames, resolveToken, themes } from './tokens';
import type { ColorTokenName, ThemeName } from './tokens';

export const CSS_PREFIX = 'er';

export function cssVarName(name: ColorTokenName): string {
  return `--${CSS_PREFIX}-color-${name}`;
}

function declarations(theme: ThemeName, indent: string): string {
  return colorTokenNames
    .map((name) => `${indent}${cssVarName(name)}: ${resolveToken(themes[theme][name])};`)
    .join('\n');
}

/**
 * Theme selection:
 * - `data-theme="light|dark"` on any ancestor forces a theme.
 * - With no attribute, the OS preference decides; light is the default.
 */
export function buildColorCss(): string {
  return [
    ':root,\n[data-theme=\'light\'] {',
    '  color-scheme: light;',
    declarations('light', '  '),
    '}',
    '',
    '[data-theme=\'dark\'] {',
    '  color-scheme: dark;',
    declarations('dark', '  '),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme]) {',
    '    color-scheme: dark;',
    declarations('dark', '    '),
    '  }',
    '}',
    '',
  ].join('\n');
}
