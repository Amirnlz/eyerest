import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { fileURLToPath } from 'node:url';
import { DimLayerManager } from './dim/dim-layer-manager';
import {
  createElectronDimDisplayPort,
  createElectronDimWindowFactory,
} from './dim/electron-dim-adapters';
import {
  createElectronDisplayPort,
  createElectronWindowFactory,
  type RendererTarget,
} from './overlay/electron-adapters';
import { OverlayWindowManager } from './overlay/overlay-window-manager';
import { resolvePlacement } from './overlay/placement';
import { resolveStartupConfig } from './platform-switches';
import { createMainRuntime, type MainRuntime } from './runtime';

// Must run before the app is ready: it chooses the display backend and GPU use.
const startup = resolveStartupConfig(process.platform, process.env);
if (startup.disableHardwareAcceleration) app.disableHardwareAcceleration();
for (const { name, value } of startup.switches) {
  app.commandLine.appendSwitch(name, value);
}

const debug = process.env['EYEREST_DEBUG'] === '1';

let runtime: MainRuntime | null = null;
let overlay: OverlayWindowManager | null = null;
let dim: DimLayerManager | null = null;

function resolveRendererTarget(): RendererTarget {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devServerUrl) return { kind: 'url', url: devServerUrl };
  return {
    kind: 'file',
    path: fileURLToPath(new URL('../renderer/index.html', import.meta.url)),
  };
}

void app.whenReady().then(() => {
  const ozone = app.commandLine.getSwitchValue('ozone-platform');
  const layout = resolvePlacement(process.platform, process.env, ozone);

  // One diagnostic line: placement problems are usually a display-backend issue.
  console.info(
    `[eyerest] platform=${process.platform} session=${process.env['XDG_SESSION_TYPE'] ?? 'n/a'} ` +
      `ozone=${ozone || 'default'} layout=${layout} ` +
      `gpu=${startup.disableHardwareAcceleration ? 'off' : 'default'} debug=${debug}`,
  );

  overlay = new OverlayWindowManager(
    createElectronWindowFactory({
      preloadPath: fileURLToPath(
        new URL('../preload/index.cjs', import.meta.url),
      ),
      target: resolveRendererTarget(),
      layout,
    }),
    createElectronDisplayPort(screen),
    {
      layout,
      log: debug
        ? (message) => console.info(`[overlay] ${message}`)
        : undefined,
    },
  );

  // Dim sits below the overlay. After it is shown, the overlay is re-raised so
  // it stays on top on platforms where show order decides stacking.
  dim = new DimLayerManager(
    createElectronDimWindowFactory(),
    createElectronDimDisplayPort(screen),
    {
      onShown: () => overlay?.raise(),
      log: debug ? (message) => console.info(`[dim] ${message}`) : undefined,
    },
  );

  runtime = createMainRuntime({
    env: process.env,
    ipcMain,
    getTargets: () =>
      BrowserWindow.getAllWindows().map((window) => window.webContents),
    extraSenders: [dim, overlay],
  });

  dim.start();
  overlay.start();
  runtime.start();
});

// No `window-all-closed` quit: the app has no regular window and lives on
// without one. The tray menu with Quit arrives in Step 1.8. Until then, stop
// the dev server with Ctrl+C.

app.on('before-quit', () => {
  runtime?.dispose();
  runtime = null;
  overlay?.dispose();
  overlay = null;
  dim?.dispose();
  dim = null;
});
