import {
  createThemeController,
  type ColorSchemeSource,
  type ThemeController,
  type ThemeTarget,
} from './theme-controller';
import { DEFAULT_THEME_PREFERENCE, type ThemePreference } from './theme';
import { createTransitionSuppressor } from './transition-suppression';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Writes the theme to `data-theme` on the root element. */
export function createDocumentThemeTarget(root: HTMLElement): ThemeTarget {
  return {
    apply(theme) {
      if (theme === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', theme);
    },
  };
}

/** Reads the OS preference through `matchMedia`. */
export function createColorSchemeSource(
  win: Pick<Window, 'matchMedia'>,
): ColorSchemeSource {
  const query = win.matchMedia(DARK_QUERY);
  return {
    prefersDark: () => query.matches,
    subscribe(listener) {
      const handle = () => listener();
      query.addEventListener('change', handle);
      return () => query.removeEventListener('change', handle);
    },
  };
}

/** The controller wired to a real window. Call `start()` once at boot. */
export function createDomThemeController(
  win: Window,
  initial: ThemePreference = DEFAULT_THEME_PREFERENCE,
): ThemeController {
  return createThemeController(
    {
      target: createDocumentThemeTarget(win.document.documentElement),
      colorScheme: createColorSchemeSource(win),
      suppressTransitions: createTransitionSuppressor({
        document: win.document,
        requestFrame: (callback) => {
          win.requestAnimationFrame(() => callback());
        },
      }),
    },
    initial,
  );
}
