import type { EyerestApi } from '../../shared/ipc';
import { DEFAULT_THEME_PREFERENCE, isThemePreference, type ThemePreference } from '../../shared/theme';
import type { ThemeController } from './theme-controller';

/**
 * The theme choice main put in the window's URL (`?theme=`). Anything missing or unknown is the
 * default, so a bad URL can never break the first paint.
 */
export function themeFromSearch(search: string): ThemePreference {
  const value = new URLSearchParams(search).get('theme');
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

/** Applies every theme change main pushes. Returns the unsubscribe function. */
export function followThemeFromMain(
  controller: Pick<ThemeController, 'setPreference'>,
  source: Pick<EyerestApi, 'onTheme'>,
): () => void {
  return source.onTheme((preference) => controller.setPreference(preference));
}
