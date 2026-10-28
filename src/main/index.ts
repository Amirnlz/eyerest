import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { join } from 'node:path';
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
import { createMediaController } from './media/create-media-controller';
import { RestMediaPauser } from './media/rest-media-pauser';
import { OverlayWindowManager } from './overlay/overlay-window-manager';
import { isNativeWayland, resolvePlacement } from './overlay/placement';
import { resolveStartupConfig } from './platform-switches';
import { createMainRuntime, type MainRuntime } from './runtime';
import { createNodeSettingsFs } from './settings/node-settings-fs';
import { SETTINGS_FILE_NAME, loadSettings } from './settings/settings';
import { acquireSingleInstance } from './single-instance';
import { createElectronTrayPort } from './tray/electron-tray-adapter';
import { TrayController } from './tray/tray-controller';

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
let tray: TrayController | null = null;

// Single instance: a second launch quits at once and shows nothing.
const primaryInstance = acquireSingleInstance(app);

function resolveRendererTarget(): RendererTarget {
  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devServerUrl) return { kind: 'url', url: devServerUrl };
  return {
    kind: 'file',
    path: fileURLToPath(new URL('../renderer/index.html', import.meta.url)),
  };
}

void app.whenReady().then(() => {
  if (!primaryInstance) return;

  // Tray-only app: no Dock icon on macOS.
  app.dock?.hide();

  const ozone = app.commandLine.getSwitchValue('ozone-platform');
  const layout = resolvePlacement(process.platform, process.env, ozone);
  const integratedDim =
    layout === 'surface' && isNativeWayland(process.platform, process.env, ozone);

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
      integratedDim,
    }),
    createElectronDisplayPort(screen),
    {
      layout,
      log: debug
        ? (message) => console.info(`[overlay] ${message}`)
        : undefined,
    },
  );

  // On platforms with separate windows, the overlay receives each snapshot
  // before the dim layer. It becomes interactive first; then the dim is shown
  // and re-raises it. Native Wayland instead draws both in the overlay window.
  dim = new DimLayerManager(
    createElectronDimWindowFactory(),
    createElectronDimDisplayPort(screen),
    {
      enabled: !integratedDim,
      onShown: () => overlay?.raise(),
      log: debug ? (message) => console.info(`[dim] ${message}`) : undefined,
    },
  );

  // Pauses playing media once per rest start (Linux MPRIS; other platforms no-op).
  const mediaLog = debug
    ? (message: string) => console.info(`[media] ${message}`)
    : undefined;
  const media = new RestMediaPauser(
    createMediaController(process.platform, mediaLog),
    { log: mediaLog },
  );

  // Settings file in the user data dir. A missing file means defaults; a bad
  // file falls back to defaults and is reported, never a crash.
  const settingsPath = join(app.getPath('userData'), SETTINGS_FILE_NAME);
  const settings = loadSettings(createNodeSettingsFs(), settingsPath);
  if (settings.status === 'invalid') {
    console.error(
      `[settings] ${settingsPath} rejected, using defaults: ${settings.issues.join('; ')}`,
    );
  } else {
    for (const issue of settings.issues) console.warn(`[settings] ${issue}`);
    if (debug) console.info(`[settings] ${settings.status} ${settingsPath}`);
  }

  // Tray: Pause/Resume reminders and Quit, plus the next rest time.
  tray = new TrayController(createElectronTrayPort(), {
    pause: () => runtime?.controller.pause(),
    resume: () => runtime?.controller.resume(),
    quit: () => app.quit(),
  });

  runtime = createMainRuntime({
    env: process.env,
    settingsOverrides: settings.overrides,
    ipcMain,
    getTargets: () =>
      BrowserWindow.getAllWindows().map((window) => window.webContents),
    extraSenders: [overlay, dim, media, tray],
  });

  dim.start();
  overlay.start();
  runtime.start();
});

// The app has no regular window and lives in the tray. This listener replaces
// Electron's default "quit when the last window closes"; Quit is in the tray menu.
app.on('window-all-closed', () => {
  // Intentionally empty: keep running in the tray.
});

app.on('before-quit', () => {
  runtime?.dispose();
  runtime = null;
  overlay?.dispose();
  overlay = null;
  dim?.dispose();
  dim = null;
  tray?.dispose();
  tray = null;
});
