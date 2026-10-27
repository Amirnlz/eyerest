import { BrowserWindow, type Screen } from "electron";
import type { DisplayPort, OverlayWindowFactory } from "./ports";

/**
 * Thin Electron bindings for the overlay ports. All decisions live in
 * `OverlayWindowManager` and `computeOverlayBounds`; this file only talks to
 * Electron, so it is covered by the Playwright smoke test instead of unit tests.
 */

export type RendererTarget =
  | { readonly kind: "url"; readonly url: string }
  | { readonly kind: "file"; readonly path: string };

export interface ElectronWindowFactoryOptions {
  readonly preloadPath: string;
  readonly target: RendererTarget;
}

export function createElectronWindowFactory(
  options: ElectronWindowFactoryOptions,
): OverlayWindowFactory {
  return {
    create(bounds) {
      const window = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        show: false,
        frame: false,
        // Opaque on purpose in Phase 1: the unstyled UI is unreadable over a
        // transparent background. Phase 3 revisits transparency with the design.
        transparent: false,
        backgroundColor: "#ffffff",
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

      // Highest level: stays above fullscreen apps on macOS and Windows.
      // Linux ignores the level; behaviour there depends on the window manager.
      window.setAlwaysOnTop(true, "screen-saver");

      if (process.platform === "darwin") {
        window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }

      if (options.target.kind === "url") {
        void window.loadURL(options.target.url);
      } else {
        void window.loadFile(options.target.path);
      }

      return window;
    },
  };
}

export function createElectronDisplayPort(screen: Screen): DisplayPort {
  return {
    getPrimaryWorkArea: () => screen.getPrimaryDisplay().workArea,

    onChange(listener) {
      screen.on("display-added", listener);
      screen.on("display-removed", listener);
      screen.on("display-metrics-changed", listener);
      return () => {
        screen.removeListener("display-added", listener);
        screen.removeListener("display-removed", listener);
        screen.removeListener("display-metrics-changed", listener);
      };
    },
  };
}
