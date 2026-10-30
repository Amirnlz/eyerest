import type { ThemeName } from '../../design/tokens';

/** What the user chooses. `system` follows the OS and is the default. */
export const themePreferences = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof themePreferences)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === 'string' &&
    (themePreferences as readonly string[]).includes(value)
  );
}

/**
 * Value of the `data-theme` attribute on the root element. `null` means no attribute: the
 * generated stylesheet then follows `prefers-color-scheme` (see `themedBlocks`).
 */
export function themeAttribute(preference: ThemePreference): ThemeName | null {
  return preference === 'system' ? null : preference;
}

/** The theme actually showing, given the preference and the OS setting. */
export function resolveTheme(
  preference: ThemePreference,
  osPrefersDark: boolean,
): ThemeName {
  if (preference === 'system') return osPrefersDark ? 'dark' : 'light';
  return preference;
}
