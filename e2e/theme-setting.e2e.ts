import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { IPC } from '../src/shared/ipc';
import { launchApp, overlayPage, type App } from './helpers';

/**
 * The theme choice (System, Light, Dark) on the real built app. Playwright cannot click a native
 * tray menu, so the saved choice is seeded in `preferences.json` and a tray change is simulated
 * by pushing on the theme channel from main, which is exactly what the tray does. Every test uses
 * a private user data dir, so the real `preferences.json` is untouched.
 */

const OPEN_SETTINGS = { EYEREST_OPEN_SETTINGS: '1' };

async function withApp(
  run: (app: App, overlay: Page, settings: Page) => Promise<void>,
  preferences?: unknown,
) {
  const dir = mkdtempSync(join(tmpdir(), 'eyerest-e2e-'));
  if (preferences !== undefined) {
    writeFileSync(join(dir, 'preferences.json'), JSON.stringify(preferences));
  }
  const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
  try {
    await expect
      .poll(() => app.windows().some((page) => page.url().includes('view=settings')), {
        timeout: 20_000,
      })
      .toBe(true);
    const settings = app.windows().find((page) => page.url().includes('view=settings'));
    const overlay = overlayPage(app);
    if (!settings || !overlay) throw new Error('windows not found');
    await run(app, overlay, settings);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const attribute = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttribute('data-theme'));

const pushFromMain = (app: App, preference: string) =>
  app.evaluate(({ BrowserWindow }, [channel, value]) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send(channel as string, value);
    }
  }, [IPC.theme.channel, preference]);

test('no saved choice: System, so the page follows the OS and sets no attribute', async () => {
  await withApp(async (_app, overlay, settings) => {
    expect(await attribute(overlay)).toBeNull();
    expect(await attribute(settings)).toBeNull();
  });
});

test.describe('a saved choice is in place at the first paint of both windows', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(theme, async () => {
      await withApp(
        async (_app, overlay, settings) => {
          expect(await attribute(overlay)).toBe(theme);
          expect(await attribute(settings)).toBe(theme);
        },
        { theme },
      );
    });
  }
});

test('a saved choice wins over the OS color scheme', async () => {
  await withApp(
    async (_app, _overlay, settings) => {
      await settings.emulateMedia({ colorScheme: 'dark' });
      const canvas = () =>
        settings.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--er-color-canvas').trim(),
        );
      const light = await canvas();
      await settings.emulateMedia({ colorScheme: 'light' });
      expect(await canvas()).toBe(light);
    },
    { theme: 'light' },
  );
});

test('an unreadable choice falls back to System', async () => {
  await withApp(
    async (_app, overlay, settings) => {
      expect(await attribute(overlay)).toBeNull();
      expect(await attribute(settings)).toBeNull();
    },
    { theme: 'blue' },
  );
});

test('a change pushed by main switches the open windows, and System removes the override', async () => {
  await withApp(async (app, overlay, settings) => {
    await pushFromMain(app, 'dark');
    await expect.poll(() => attribute(overlay)).toBe('dark');
    await expect.poll(() => attribute(settings)).toBe('dark');

    await pushFromMain(app, 'light');
    await expect.poll(() => attribute(settings)).toBe('light');

    await pushFromMain(app, 'system');
    await expect.poll(() => attribute(overlay)).toBeNull();
    await expect.poll(() => attribute(settings)).toBeNull();
  });
});

test('a malformed push is ignored', async () => {
  await withApp(
    async (app, _overlay, settings) => {
      await pushFromMain(app, 'blue');
      await pushFromMain(app, '');
      // Give the push time to arrive, then check nothing changed.
      await settings.waitForTimeout(500);
      expect(await attribute(settings)).toBe('dark');
    },
    { theme: 'dark' },
  );
});
