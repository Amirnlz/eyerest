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

const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });

/**
 * Submits from the keyboard. A pointer click first waits for the element to be "stable", which
 * needs animation frames; a settings window that is not painting never produces them and the
 * click times out. A key press does not wait for frames and still exercises the real submit path.
 */
async function submit(page: Page, name: string) {
  await field(page, name).press('Enter');
}

/** Resolves when the page's window closes. Register before the action that closes it. */
const closed = (page: Page) => page.waitForEvent('close', { timeout: 10_000 });

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
      await field(page, 'Postpone by').fill('3');
      await submit(page, 'Postpone by');

      await expect(page.getByRole('status')).toHaveText('Settings saved.');
      // Only the value that differs from the defaults is stored, in milliseconds.
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ postponeMs: 180_000 });
    } finally {
      await first.close();
    }

    const second = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(second);
      await expect(field(page, 'Postpone by')).toHaveValue('3');
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
      await submit(page, 'Heads-up');

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
          workIntervalMs: 24 * 60 * 60_000,
          warningMs: 15_000,
          eyeRestMs: 20_000,
          longRestMs: 600_000,
          cyclesBeforeLongRest: 3,
          postponeMs: 300_000,
        }),
      );
      expect(reply).toMatchObject({ ok: false });
      expect(JSON.stringify(reply)).toMatch(/workIntervalMs/);
      expect(existsSync(join(dir, 'settings.json'))).toBe(false);
    } finally {
      await app.close();
    }
  }),
);

test(
  'refuses a number outside the allowed range and writes nothing',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);
      await field(page, 'Work interval').fill('41');
      await submit(page, 'Work interval');

      await expect(page.getByRole('alert')).toHaveText('Fix the highlighted fields to save.');
      await expect(field(page, 'Work interval')).toHaveAttribute('aria-invalid', 'true');
      expect(existsSync(join(dir, 'settings.json'))).toBe(false);
    } finally {
      await app.close();
    }
  }),
);

test(
  'takes digits only and has no spin buttons',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);
      await expect(page.getByRole('spinbutton')).toHaveCount(0);

      const input = field(page, 'Postpone by');
      await input.fill('');
      await input.pressSequentially('a4-.x');
      await expect(input).toHaveValue('4');
    } finally {
      await app.close();
    }
  }),
);

test(
  'closes with Escape',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);
      await field(page, 'Work interval').focus();
      const gone = closed(page);
      await page.keyboard.press('Escape');
      await gone;
      expect(app.windows().some((candidate) => candidate.url().includes('view=settings'))).toBe(
        false,
      );
    } finally {
      await app.close();
    }
  }),
);

test(
  'closes with the Close button, saving nothing',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);
      await field(page, 'Postpone by').fill('3');
      const close = page.getByRole('button', { name: 'Close' });
      await close.focus();
      const gone = closed(page);
      await close.press('Enter');
      await gone;
      expect(existsSync(join(dir, 'settings.json'))).toBe(false);
    } finally {
      await app.close();
    }
  }),
);
