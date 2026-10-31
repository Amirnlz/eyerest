import type { SettingsWindowFactory, SettingsWindowPort } from './window-ports';

/**
 * Keeps at most one settings window. Opening while it is open focuses it instead of making a
 * second one, so the form is never edited in two places. A closed window is forgotten and the
 * next `open()` builds a fresh one, which reloads the saved values from main.
 */
export class SettingsWindowManager {
  private window: SettingsWindowPort | null = null;

  constructor(private readonly factory: SettingsWindowFactory) {}

  open(): void {
    const current = this.window;
    if (current !== null && !current.isDestroyed()) {
      current.focus();
      return;
    }

    const created = this.factory.create();
    this.window = created;
    created.onClosed(() => {
      if (this.window === created) this.window = null;
    });
  }

  /** Closes the window if one is open. Safe to call twice. */
  dispose(): void {
    const current = this.window;
    this.window = null;
    if (current !== null && !current.isDestroyed()) current.close();
  }
}
