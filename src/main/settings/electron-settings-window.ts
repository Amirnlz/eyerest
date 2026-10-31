import { BrowserWindow, app } from 'electron';
import type { RendererTarget } from '../overlay/electron-adapters';
import type { SettingsWindowFactory } from './window-ports';

export interface ElectronSettingsWindowOptions {
  readonly preloadPath: string;
  readonly target: RendererTarget;
  readonly title: string;
}

/**
 * Thin Electron bindings for the settings window port. All decisions live in
 * `SettingsWindowManager`; this file only talks to Electron, so the Playwright settings test
 * covers it instead of unit tests.
 *
 * Platforms: a normal framed window on Windows, macOS and Linux (X11 and Wayland). The app has no
 * Dock icon on macOS, so a window opened from the tray must take focus explicitly.
 */
export function createElectronSettingsWindowFactory(
  options: ElectronSettingsWindowOptions,
): SettingsWindowFactory {
  return {
    create() {
      const window = new BrowserWindow({
        width: 480,
        height: 760,
        minWidth: 400,
        minHeight: 480,
        title: options.title,
        // Shown on ready-to-show, so the window never flashes an empty frame.
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
          preload: options.preloadPath,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });

      // Local content only: no new windows and no navigation away from the settings page.
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      window.webContents.on('will-navigate', (event) => event.preventDefault());

      window.webContents.on('did-fail-load', (_event, code, description, url) => {
        console.error(`[settings-window] did-fail-load ${code} ${description} ${url}`);
      });
      window.webContents.on('render-process-gone', (_event, details) => {
        console.error(`[settings-window] render-process-gone ${details.reason}; closing`);
        if (!window.isDestroyed()) window.destroy();
      });

      const focus = (): void => {
        if (window.isDestroyed()) return;
        if (process.platform === 'darwin') app.focus({ steal: true });
        if (window.isMinimized()) window.restore();
        window.show();
        window.focus();
      };
      window.once('ready-to-show', focus);

      loadSettingsPage(window, options.target);

      return {
        focus,
        onClosed: (listener) => window.once('closed', listener),
        close: () => window.close(),
        isDestroyed: () => window.isDestroyed(),
      };
    },
  };
}

/** The renderer picks the settings screen from the `?view=settings` query parameter. */
function loadSettingsPage(window: BrowserWindow, target: RendererTarget): void {
  if (target.kind === 'url') {
    const url = new URL(target.url);
    url.searchParams.set('view', 'settings');
    void window.loadURL(url.toString());
  } else {
    void window.loadFile(target.path, { query: { view: 'settings' } });
  }
}
