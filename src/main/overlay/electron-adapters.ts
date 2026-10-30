import { BrowserWindow, nativeTheme, type Screen } from 'electron';
import type { OverlayLayout } from '../../shared/overlay-layout';
import { OVERLAY_LEVEL } from '../window-levels';
import type { DisplayPort, OverlayWindowFactory } from './ports';
import { overlayWindowBackground } from './window-background';

/**
 * Thin Electron bindings for the overlay ports. All decisions live in
 * `OverlayWindowManager` and the bounds functions; this file only talks to
 * Electron, so it is covered by the Playwright smoke test instead of unit tests.
 */

export type RendererTarget =
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'file'; readonly path: string };

export interface ElectronWindowFactoryOptions {
  readonly preloadPath: string;
  readonly target: RendererTarget;
  readonly layout: OverlayLayout;
  /** Draw the dim and rest panel in this window when native Wayland forbids stacking. */
  readonly integratedDim?: boolean;
}

export function createElectronWindowFactory(
  options: ElectronWindowFactoryOptions,
): OverlayWindowFactory {
  const transparent = options.layout === 'surface';

  return {
    create(bounds) {
      const window = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        show: false,
        frame: false,
        // The surface layout covers the whole work area and must be see-through.
        // The small positioned window stays opaque until step 3.1: the panel is
        // not styled yet. Its color follows the theme (see window-background.ts).
        transparent,
        backgroundColor: overlayWindowBackground(
          options.layout,
          nativeTheme.shouldUseDarkColors,
        ),
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        webPreferences: {
          preload: options.preloadPath,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });

      // Keep the native background in step with an OS theme change while the window lives.
      const syncBackground = (): void => {
        if (window.isDestroyed()) return;
        window.setBackgroundColor(
          overlayWindowBackground(
            options.layout,
            nativeTheme.shouldUseDarkColors,
          ),
        );
      };
      nativeTheme.on('updated', syncBackground);
      window.once('closed', () =>
        nativeTheme.removeListener('updated', syncBackground),
      );

      // A new window lets clicks through; the manager makes it interactive for the rest.
      window.setIgnoreMouseEvents(true);

      // Highest level: stays above fullscreen apps on macOS and Windows.
      // Linux ignores the level; X11 honours it, native Wayland has no always-on-top.
      window.setAlwaysOnTop(true, OVERLAY_LEVEL);

      if (process.platform === 'darwin') {
        window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }

      // Failures here would otherwise leave a blank or missing window with no explanation.
      window.webContents.on(
        'did-fail-load',
        (_event, code, description, url) => {
          console.error(
            `[overlay] did-fail-load ${code} ${description} ${url}`,
          );
        },
      );
      // A crashed renderer must never leave an invisible window capturing clicks:
      // destroy it, and the manager creates a fresh one on the next snapshot.
      window.webContents.on('render-process-gone', (_event, details) => {
        console.error(
          `[overlay] render-process-gone ${details.reason}; destroying window`,
        );
        if (!window.isDestroyed()) window.destroy();
      });

      loadRenderer(
        window,
        options.target,
        options.layout,
        options.integratedDim,
      );

      return {
        setBounds: (next) => window.setBounds(next),
        showInactive: () => window.showInactive(),
        hide: () => window.hide(),
        moveTop: () => window.moveTop(),
        setInteractive: (interactive) =>
          window.setIgnoreMouseEvents(!interactive),
        isDestroyed: () => window.isDestroyed(),
        destroy: () => window.destroy(),
      };
    },
  };
}

/** The layout is passed to the renderer as a `?layout=` query parameter. */
function loadRenderer(
  window: BrowserWindow,
  target: RendererTarget,
  layout: OverlayLayout,
  integratedDim = false,
): void {
  if (target.kind === 'url') {
    const url = new URL(target.url);
    url.searchParams.set('layout', layout);
    if (integratedDim) url.searchParams.set('integratedDim', '1');
    void window.loadURL(url.toString());
  } else {
    void window.loadFile(target.path, {
      query: { layout, ...(integratedDim ? { integratedDim: '1' } : {}) },
    });
  }
}

/** Subscribes to display add, remove and resize. Returns the unsubscribe function. */
export function watchDisplayChanges(
  screen: Screen,
  listener: () => void,
): () => void {
  screen.on('display-added', listener);
  screen.on('display-removed', listener);
  screen.on('display-metrics-changed', listener);
  return () => {
    screen.removeListener('display-added', listener);
    screen.removeListener('display-removed', listener);
    screen.removeListener('display-metrics-changed', listener);
  };
}

export function createElectronDisplayPort(screen: Screen): DisplayPort {
  return {
    getPrimaryWorkArea: () => screen.getPrimaryDisplay().workArea,
    onChange: (listener) => watchDisplayChanges(screen, listener),
  };
}
