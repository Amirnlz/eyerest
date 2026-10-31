import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { launchApp, type App } from './helpers';

/**
 * Settings window smoke tests against the real built app. Playwright cannot click a native tray
 * menu, so `EYEREST_OPEN_SETTINGS=1` opens the window at launch. Every test uses a private user
 * data dir, so the real `settings.json` is never read or written.
 */

const OPEN_SETTINGS = { EYEREST_OPEN_SETTINGS: '1' };

function withUserDataDir(run: (dir: string) => Promise<void>) {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), 'eyerest-e2e-'));
    try {
      await run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

async function openSettings(app: App): Promise<Page> {
  await expect
    .poll(() => app.windows().some((page) => page.url().includes('view=settings')), {
      timeout: 20_000,
    })
    .toBe(true);
  const page = app.windows().find((candidate) => candidate.url().includes('view=settings'));
  if (!page) throw new Error('settings window page not found');
  return page;
}

const field = (page: Page, name: string) => page.getByRole('spinbutton', { name });

test(
  'opens a normal, focused window with the default values',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);

      await expect(page).toHaveTitle('eyerest settings');
      await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
      await expect(field(page, 'Work interval')).toHaveValue('20');
      await expect(field(page, 'Heads-up')).toHaveValue('15');
      await expect(field(page, 'Eye rest')).toHaveValue('20');
      await expect(field(page, 'Long rest')).toHaveValue('10');
      await expect(field(page, 'Long rest every')).toHaveValue('3');
      await expect(field(page, 'Postpone by')).toHaveValue('5');

      await expect
        .poll(() =>
          app.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows().find(
              (candidate) =>
                !candidate.isDestroyed() &&
                candidate.webContents.getURL().includes('view=settings'),
            );
            return win
              ? { visible: win.isVisible(), alwaysOnTop: win.isAlwaysOnTop() }
              : null;
          }),
        )
        .toEqual({ visible: true, alwaysOnTop: false });
    } finally {
      await app.close();
    }
  }),
);

test(
  'saves to settings.json and shows the saved value after a restart',
  withUserDataDir(async (dir) => {
    const file = join(dir, 'settings.json');

    const first = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(first);
      await field(page, 'Postpone by').fill('2');
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByRole('status')).toHaveText('Settings saved.');
      // Only the value that differs from the defaults is stored, in milliseconds.
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ postponeMs: 120_000 });
    } finally {
      await first.close();
    }

    const second = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(second);
      await expect(field(page, 'Postpone by')).toHaveValue('2');
      await expect(field(page, 'Work interval')).toHaveValue('20');
    } finally {
      await second.close();
    }
  }),
);

test(
  'refuses invalid values and writes nothing',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);
      await field(page, 'Heads-up').fill('');
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByRole('alert')).toHaveText('Fix the highlighted fields to save.');
      await expect(field(page, 'Heads-up')).toBeFocused();
      await expect(field(page, 'Heads-up')).toHaveAttribute('aria-invalid', 'true');
      expect(existsSync(join(dir, 'settings.json'))).toBe(false);
    } finally {
      await app.close();
    }
  }),
);

test(
  'main rejects an invalid payload sent straight over IPC and writes nothing',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);
      // The form would stop this, so go around it: main must not trust the renderer.
      const reply = await page.evaluate(() =>
        window.eyerest?.saveSettings({
          workIntervalMs: 60_000,
          warningMs: 60_000,
          eyeRestMs: 20_000,
          longRestMs: 600_000,
          cyclesBeforeLongRest: 3,
          postponeMs: 300_000,
        }),
      );
      expect(reply).toEqual({
        ok: false,
        error: 'warningMs must be shorter than workIntervalMs',
      });
      expect(existsSync(join(dir, 'settings.json'))).toBe(false);
    } finally {
      await app.close();
    }
  }),
);
