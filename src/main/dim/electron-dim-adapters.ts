import { BrowserWindow, type Screen } from 'electron';
import { watchDisplayChanges } from '../overlay/electron-adapters';
import { DIM_LEVEL } from '../window-levels';
import { DIM_PAGE_URL, DIM_VISIBLE_CLASS } from './dim-page';
import type { DimDisplayPort, DimWindowFactory } from './ports';

/**
 * Thin Electron bindings for the dim ports. All decisions live in
 * `DimLayerManager`; this file only talks to Electron, so it is covered by the
 * Playwright smoke test instead of unit tests.
 */
export function createElectronDimWindowFactory(): DimWindowFactory {
  return {
    create(bounds) {
      const window = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        show: false,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        // Never takes keyboard focus; the user's app keeps it.
        focusable: false,
        alwaysOnTop: true,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });

      window.setIgnoreMouseEvents(true);
      // Below the overlay, which uses 'screen-saver'.
      window.setAlwaysOnTop(true, DIM_LEVEL);

      if (process.platform === 'darwin') {
        window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }

      window.webContents.on(
        'did-fail-load',
        (_event, code, description, url) => {
          console.error(`[dim] did-fail-load ${code} ${description} ${url}`);
        },
      );
      // A crashed renderer must never leave an invisible window capturing clicks.
      window.webContents.on('render-process-gone', (_event, details) => {
        console.error(
          `[dim] render-process-gone ${details.reason}; destroying window`,
        );
        if (!window.isDestroyed()) window.destroy();
      });

      // The fade-in class can only be applied once the page has loaded; the
      // flags cover a show that arrives before that.
      let loaded = false;
      let wanted = false;
      const applyClass = (): void => {
        if (!loaded || window.isDestroyed()) return;
        const script = wanted
          ? `document.body.classList.add('${DIM_VISIBLE_CLASS}')`
          : `document.body.classList.remove('${DIM_VISIBLE_CLASS}')`;
        void window.webContents.executeJavaScript(script).catch(() => {});
      };
      window.webContents.on('did-finish-load', () => {
        loaded = true;
        applyClass();
      });
      void window.loadURL(DIM_PAGE_URL);

      return {
        setBounds: (next) => window.setBounds(next),
        showInactive: () => {
          wanted = true;
          window.showInactive();
          applyClass();
        },
        hide: () => {
          wanted = false;
          applyClass();
          window.hide();
        },
        setInteractive: (interactive) =>
          window.setIgnoreMouseEvents(!interactive),
        isDestroyed: () => window.isDestroyed(),
        destroy: () => window.destroy(),
      };
    },
  };
}

export function createElectronDimDisplayPort(screen: Screen): DimDisplayPort {
  return {
    getDisplays: () =>
      screen
        .getAllDisplays()
        .map((display) => ({ id: display.id, bounds: display.bounds })),
    onChange: (listener) => watchDisplayChanges(screen, listener),
  };
}
