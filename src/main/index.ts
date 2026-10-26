import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { createMainRuntime, type MainRuntime } from './runtime';

let runtime: MainRuntime | null = null;

/**
 * TEMPORARY window for Step 1.3 so the full flow can be seen.
 * Step 1.4 replaces it with the frameless top-right overlay window.
 */
function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 480,
    height: 360,
    show: false,
    webPreferences: {
      preload: fileURLToPath(new URL('../preload/index.cjs', import.meta.url)),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(fileURLToPath(new URL('../renderer/index.html', import.meta.url)));
  }

  return window;
}

void app.whenReady().then(() => {
  runtime = createMainRuntime({
    env: process.env,
    ipcMain,
    getTargets: () => BrowserWindow.getAllWindows().map((window) => window.webContents),
  });

  createWindow();
  runtime.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  runtime?.dispose();
  runtime = null;
});
