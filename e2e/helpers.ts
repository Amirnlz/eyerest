import { _electron as electron, type Page } from '@playwright/test';

/**
 * Shared helpers for the smoke tests. Dim windows load a `data:` page; the
 * overlay loads the renderer. That difference tells them apart.
 */

export type Layout = 'positioned' | 'surface';

export interface LaunchOptions {
  /** Extra environment variables, such as `EYEREST_OPEN_SETTINGS=1`. */
  readonly env?: Readonly<Record<string, string>>;
  /**
   * A private user data dir. Tests that save settings must pass one, so they never touch the
   * real `settings.json` of the person running them. It also scopes the single-instance lock.
   */
  readonly userDataDir?: string;
}

export async function launchApp(layout: Layout = 'positioned', options: LaunchOptions = {}) {
  return electron.launch({
    args: [
      '.',
      ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
      ...(options.userDataDir === undefined ? [] : [`--user-data-dir=${options.userDataDir}`]),
    ],
    env: {
      ...process.env,
      EYEREST_FAST: '1',
      EYEREST_PLACEMENT: layout,
      ...options.env,
    } as Record<string, string>,
  });
}

export type App = Awaited<ReturnType<typeof launchApp>>;

export function overlayState(app: App) {
  return app.evaluate(({ BrowserWindow, screen }) => {
    const win = BrowserWindow.getAllWindows().find(
      (candidate) =>
        !candidate.isDestroyed() &&
        !candidate.webContents.getURL().startsWith('data:'),
    );
    if (!win) return null;
    return {
      visible: win.isVisible(),
      alwaysOnTop: win.isAlwaysOnTop(),
      bounds: win.getBounds(),
      workArea: screen.getPrimaryDisplay().workArea,
    };
  });
}

export function dimState(app: App) {
  return app.evaluate(({ BrowserWindow, screen }) => ({
    windows: BrowserWindow.getAllWindows()
      .filter(
        (win) =>
          !win.isDestroyed() && win.webContents.getURL().startsWith('data:'),
      )
      .map((win) => ({
        visible: win.isVisible(),
        alwaysOnTop: win.isAlwaysOnTop(),
        bounds: win.getBounds(),
      })),
    displays: screen.getAllDisplays().map((display) => display.bounds),
  }));
}

/** The overlay's renderer page (not a dim page). */
export function overlayPage(app: App): Page | undefined {
  return app.windows().find((page) => !page.url().startsWith('data:'));
}
