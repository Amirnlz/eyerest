import { app, BrowserWindow, globalShortcut, ipcMain, powerMonitor, screen } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAutostart } from './autostart/create-autostart';
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
import { createElectronIdleSource } from './idle/electron-idle-source';
import { OverlayWindowManager } from './overlay/overlay-window-manager';
import { isNativeWayland, resolvePlacement } from './overlay/placement';
import { resolveStartupConfig } from './platform-switches';
import { createBroadcastCueOutput } from './sound/cue-output';
import { SoundCueSender } from './sound/sound-cue-sender';
import { STATS_FILE_NAME } from './stats/stats-file';
import { StatsRecorder } from './stats/stats-recorder';
import { StatsStore } from './stats/stats-store';
import { systemClock } from '../core/scheduler';
import { PREFERENCES_FILE_NAME } from './preferences/preferences';
import { PreferencesStore, soundPrefsView } from './preferences/preferences-store';
import { DndService } from './dnd/dnd-service';
import { createBroadcastExercisesOutput } from './exercises/exercises-output';
import { ExercisesService } from './exercises/exercises-service';
import { createBroadcastThemeOutput } from './theme/theme-output';
import { ThemeService } from './theme/theme-service';
import { createElectronShortcutRegistrar } from './shortcuts/electron-shortcut-registrar';
import { createBroadcastShortcutHintsOutput } from './shortcuts/shortcut-hints-output';
import { ShortcutController } from './shortcuts/shortcut-controller';
import { createMainRuntime, type MainRuntime } from './runtime';
import { createElectronSettingsWindowFactory } from './settings/electron-settings-window';
import { createNodeSettingsFs } from './settings/node-settings-fs';
import { SETTINGS_FILE_NAME, loadSettings, saveSettings } from './settings/settings';
import { SettingsWindowManager } from './settings/settings-window-manager';
import { acquireSingleInstance } from './single-instance';
import { createElectronTrayPort } from './tray/electron-tray-adapter';
import { TrayController } from './tray/tray-controller';
import { trayIconDir } from './tray/tray-icon';

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
let shortcuts: ShortcutController | null = null;
let settingsWindow: SettingsWindowManager | null = null;

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

  // Person-level choices (sound, theme, exercises) live in preferences.json. Created first: the overlay and
  // settings windows read the theme choice when they open. Changes are pushed to open windows.
  const settingsFs = createNodeSettingsFs();
  const getRendererTargets = () =>
    BrowserWindow.getAllWindows().map((window) => window.webContents);
  const preferences = new PreferencesStore(
    settingsFs,
    join(app.getPath('userData'), PREFERENCES_FILE_NAME),
    (message) => console.warn(`[preferences] ${message}`),
  );
  const soundPrefs = soundPrefsView(preferences);
  const theme = new ThemeService(preferences, createBroadcastThemeOutput(getRendererTargets));
  const exercises = new ExercisesService(
    preferences,
    createBroadcastExercisesOutput(getRendererTargets),
  );
  // In memory only, on purpose: see DndService. The runtime exists by the time a tray click can arrive.
  const dnd = new DndService(() => runtime?.controller);
  // Rest statistics stay on this machine, in stats.json next to settings.json.
  const stats = new StatsStore(
    settingsFs,
    join(app.getPath('userData'), STATS_FILE_NAME),
    (message) => console.warn(`[stats] ${message}`),
  );
  const statsRecorder = new StatsRecorder(stats, systemClock);
  // Global Skip and Postpone keys, held only while a rest shows. Off on native Wayland, which has
  // no global key grab; the OS refusing a key is logged and leaves the buttons as the only way.
  shortcuts = new ShortcutController(
    createElectronShortcutRegistrar(globalShortcut),
    () => runtime?.controller,
    createBroadcastShortcutHintsOutput(getRendererTargets),
    {
      enabled: !isNativeWayland(process.platform, process.env, ozone),
      platform: process.platform,
      log: (message) => console.warn(`[shortcuts] ${message}`),
    },
  );
  const soundCues = new SoundCueSender(soundPrefs, createBroadcastCueOutput(getRendererTargets));

  overlay = new OverlayWindowManager(
    createElectronWindowFactory({
      preloadPath: fileURLToPath(
        new URL('../preload/index.cjs', import.meta.url),
      ),
      target: resolveRendererTarget(),
      layout,
      integratedDim,
      getTheme: () => theme.get(),
      getExercises: () => exercises.get(),
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

  // Settings file in the user data dir. A missing file means defaults; a bad
  // file falls back to defaults and is reported, never a crash.
  const settingsPath = join(app.getPath('userData'), SETTINGS_FILE_NAME);
  const settings = loadSettings(settingsFs, settingsPath);
  if (settings.status === 'invalid') {
    console.error(
      `[settings] ${settingsPath} rejected, using defaults: ${settings.issues.join('; ')}`,
    );
  } else {
    for (const issue of settings.issues) console.warn(`[settings] ${issue}`);
    if (debug) console.info(`[settings] ${settings.status} ${settingsPath}`);
  }

  // Settings window: opened from the tray menu, one at a time, same renderer bundle.
  settingsWindow = new SettingsWindowManager(
    createElectronSettingsWindowFactory({
      preloadPath: fileURLToPath(
        new URL('../preload/index.cjs', import.meta.url),
      ),
      target: resolveRendererTarget(),
      title: 'eyerest settings',
      log: debug ? (message) => console.info(`[settings-window] ${message}`) : undefined,
      getTheme: () => theme.get(),
    }),
  );

  // Tray: Pause/Resume reminders, Settings and Quit, plus the next rest time.
  tray = new TrayController(
    createElectronTrayPort({
      iconDir: trayIconDir({
        isPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath,
        appPath: app.getAppPath(),
      }),
    }),
    {
      pause: () => runtime?.controller.pause(),
      resume: () => runtime?.controller.resume(),
      openSettings: () => settingsWindow?.open(),
      quit: () => app.quit(),
    },
    undefined,
    {
      autostart: createAutostart({
        platform: process.platform,
        isPackaged: app.isPackaged,
        env: process.env,
        execPath: process.execPath,
        loginItemApp: app,
        fs: settingsFs,
        configHome: app.getPath('appData'),
      }),
      log: (message) => console.warn(`[autostart] ${message}`),
      sound: soundPrefs,
      theme,
      exercises,
      dnd,
    },
  );

  runtime = createMainRuntime({
    env: process.env,
    settingsOverrides: settings.overrides,
    closeSettingsWindow: () => settingsWindow?.close(),
    schedule: {
      prefs: {
        get: () => preferences.get().schedule,
        set: (next) => preferences.update({ schedule: next }),
      },
      log: debug ? (message) => console.info(`[schedule] ${message}`) : undefined,
    },
    idle: {
      source: createElectronIdleSource(powerMonitor),
      log: debug ? (message) => console.info(`[idle] ${message}`) : undefined,
    },
    settingsStorage: {
      save: (overrides) => saveSettings(settingsFs, settingsPath, overrides),
    },
    ipcMain,
    getTargets: getRendererTargets,
    getStats: () => stats.recent(systemClock.now(), 7),
    extraSenders: [overlay, dim, soundCues, statsRecorder, shortcuts, tray],
  });

  dim.start();
  overlay.start();
  runtime.start();

  // Test hook for the Playwright settings test: Playwright cannot click a native tray menu.
  if (process.env['EYEREST_OPEN_SETTINGS'] === '1') settingsWindow.open();
});

// The app has no regular window and lives in the tray. This listener replaces
// Electron's default "quit when the last window closes"; Quit is in the tray menu.
app.on('window-all-closed', () => {
  // Intentionally empty: keep running in the tray.
});

app.on('before-quit', () => {
  shortcuts?.dispose();
  shortcuts = null;
  runtime?.dispose();
  runtime = null;
  overlay?.dispose();
  overlay = null;
  dim?.dispose();
  dim = null;
  tray?.dispose();
  tray = null;
  settingsWindow?.dispose();
  settingsWindow = null;
});
