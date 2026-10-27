import { app, BrowserWindow, ipcMain, screen } from "electron";
import { fileURLToPath } from "node:url";
import {
  createElectronDisplayPort,
  createElectronWindowFactory,
  type RendererTarget,
} from "./overlay/electron-adapters";
import { OverlayWindowManager } from "./overlay/overlay-window-manager";
import { createMainRuntime, type MainRuntime } from "./runtime";

let runtime: MainRuntime | null = null;
let overlay: OverlayWindowManager | null = null;

function resolveRendererTarget(): RendererTarget {
  const devServerUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devServerUrl) return { kind: "url", url: devServerUrl };
  return {
    kind: "file",
    path: fileURLToPath(new URL("../renderer/index.html", import.meta.url)),
  };
}

void app.whenReady().then(() => {
  overlay = new OverlayWindowManager(
    createElectronWindowFactory({
      preloadPath: fileURLToPath(
        new URL("../preload/index.cjs", import.meta.url),
      ),
      target: resolveRendererTarget(),
    }),
    createElectronDisplayPort(screen),
  );

  runtime = createMainRuntime({
    env: process.env,
    ipcMain,
    getTargets: () =>
      BrowserWindow.getAllWindows().map((window) => window.webContents),
    extraSenders: [overlay],
  });

  overlay.start();
  runtime.start();
});

// No `window-all-closed` quit: the app has no regular window and lives on
// without one. The tray menu with Quit arrives in Step 1.8. Until then, stop
// the dev server with Ctrl+C.

app.on("before-quit", () => {
  runtime?.dispose();
  runtime = null;
  overlay?.dispose();
  overlay = null;
});
