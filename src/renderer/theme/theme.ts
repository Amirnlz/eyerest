import type { ThemeName } from '../../design/tokens';
import type { ThemePreference } from '../../shared/theme';

export {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  themePreferences,
  type ThemePreference,
} from '../../shared/theme';

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
