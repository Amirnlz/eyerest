import type { ThemePreference } from '../../shared/theme';

/** The theme choice. `set` stores it and tells every window. */
export interface ThemePort {
  get(): ThemePreference;
  set(next: ThemePreference): void;
}

/** Where a change goes. In the app this is a push to every renderer. */
export interface ThemeOutput {
  push(preference: ThemePreference): void;
}
