import type { ThemeName } from './tokens';

/**
 * Wraps per-theme declarations in the three scopes every themed token needs:
 * - `:root` and `[data-theme='light']`: light, also the default
 * - `[data-theme='dark']`: forced dark
 * - `:root:not([data-theme])` under `prefers-color-scheme: dark`: OS dark when nothing is forced
 *
 * Any custom property whose value uses `var(--er-color-*)` MUST be declared through this helper.
 * A `var()` resolves on the element that declares it, so a value declared only on `:root` would
 * keep the light theme's colors inside `[data-theme='dark']`.
 */
type ThemeLines = (theme: ThemeName, indent: string) => readonly string[];

export function themedBlocks(lines: ThemeLines): string {
  return [
    ":root,\n[data-theme='light'] {",
    ...lines('light', '  '),
    '}',
    '',
    "[data-theme='dark'] {",
    ...lines('dark', '  '),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme]) {',
    ...lines('dark', '    '),
    '  }',
    '}',
    '',
  ].join('\n');
}
