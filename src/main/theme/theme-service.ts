import type { ThemePreference } from '../../shared/theme';
import type { PreferencesStore } from '../preferences/preferences-store';
import type { ThemeOutput, ThemePort } from './ports';

/**
 * Owns the theme choice: stores it, then pushes it so open windows switch at once. Choosing the
 * current value again does nothing (no write, no push). The store applies a change in memory
 * even when the disk write fails, so the push after it is always true to what the app now holds.
 *
 * Deliberately does not touch `nativeTheme.themeSource`: it would also recolor the tray icon,
 * which must follow the OS bar color, not this choice. Window frames stay OS-themed.
 */
export class ThemeService implements ThemePort {
  constructor(
    private readonly store: Pick<PreferencesStore, 'get' | 'update'>,
    private readonly output: ThemeOutput,
  ) {}

  get(): ThemePreference {
    return this.store.get().theme;
  }

  set(next: ThemePreference): void {
    if (next === this.store.get().theme) return;
    this.store.update({ theme: next });
    this.output.push(next);
  }
}
