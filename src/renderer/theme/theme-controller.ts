import type { ThemeName } from '../../design/tokens';
import {
  DEFAULT_THEME_PREFERENCE,
  resolveTheme,
  themeAttribute,
  type ThemePreference,
} from './theme';

/** Where the chosen theme is written. The DOM adapter sets or removes `data-theme`. */
export interface ThemeTarget {
  /** `null` removes the override, so the OS preference decides. */
  apply(theme: ThemeName | null): void;
}

/** The OS color-scheme preference, as a port so the controller never touches `matchMedia`. */
export interface ColorSchemeSource {
  prefersDark(): boolean;
  /** Calls `listener` whenever the OS preference changes. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

/**
 * Runs `apply` with every CSS transition switched off for the change, then restores them
 * (better-ui, M10). Without it, each color transition fires at once and the switch smears.
 */
export type TransitionSuppressor = (apply: () => void) => void;

export interface ThemeControllerPorts {
  readonly target: ThemeTarget;
  readonly colorScheme: ColorSchemeSource;
  readonly suppressTransitions: TransitionSuppressor;
}

export interface ThemeController {
  preference(): ThemePreference;
  /** The theme showing now. */
  resolved(): ThemeName;
  /** No-op when the preference is unchanged. */
  setPreference(preference: ThemePreference): void;
  /** Applies the preference and starts following OS changes. Calling it twice does nothing. */
  start(): void;
  stop(): void;
}

/**
 * Owns the theme preference. Pure orchestration: the DOM, `matchMedia` and the frame scheduler
 * are all injected, so every path is testable without a browser.
 *
 * With `system` there is no `data-theme` attribute and the stylesheet's media query does the work.
 * An OS change then has nothing to apply, but it still flips every color, so it is wrapped in the
 * suppressor too. With a forced theme the OS is ignored.
 */
export function createThemeController(
  ports: ThemeControllerPorts,
  initial: ThemePreference = DEFAULT_THEME_PREFERENCE,
): ThemeController {
  const { target, colorScheme, suppressTransitions } = ports;
  let current = initial;
  let unsubscribe: (() => void) | null = null;

  return {
    preference: () => current,

    resolved: () => resolveTheme(current, colorScheme.prefersDark()),

    setPreference(next) {
      if (next === current) return;
      current = next;
      suppressTransitions(() => target.apply(themeAttribute(next)));
    },

    start() {
      if (unsubscribe !== null) return;
      // First paint has nothing to animate from, so no suppression here.
      target.apply(themeAttribute(current));
      unsubscribe = colorScheme.subscribe(() => {
        if (current !== 'system') return;
        suppressTransitions(() => undefined);
      });
    },

    stop() {
      unsubscribe?.();
      unsubscribe = null;
    },
  };
}
