import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { launchApp, overlayState, type App } from './helpers';

/**
 * Working hours against the real built app. Time cannot be faked in the packaged app, so the
 * schedules here are built from the real day of the week: "every day except today" is outside the
 * window right now, and "every day" with a whole-day window is inside it. Each test uses a private
 * user data dir, so the real `preferences.json` is never read or written.
 */

test.setTimeout(90_000);

const OPEN_SETTINGS = { EYEREST_OPEN_SETTINGS: '1' };
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

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

function seedSchedule(dir: string, days: readonly number[]) {
  writeFileSync(
    join(dir, 'preferences.json'),
    JSON.stringify({ schedule: { enabled: true, days, startMinute: 0, endMinute: 1440 } }),
  );
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

const form = (page: Page) => page.getByRole('form', { name: 'Working hours' });

test(
  'outside working hours no warning or rest ever appears',
  withUserDataDir(async (dir) => {
    // Every day except today: the app starts outside the window and pauses.
    seedSchedule(dir, ALL_DAYS.filter((day) => day !== new Date().getDay()));
    const app = await launchApp('positioned', { userDataDir: dir });
    try {
      const visible = async () => (await overlayState(app))?.visible ?? false;
      // In fast mode the first warning would show after about 5 s and a cycle takes 25 s.
      await new Promise((resolve) => setTimeout(resolve, 30_000));
      expect(await visible()).toBe(false);
    } finally {
      await app.close();
    }
  }),
);

test(
  'inside working hours reminders run as usual',
  withUserDataDir(async (dir) => {
    seedSchedule(dir, ALL_DAYS);
    const app = await launchApp('positioned', { userDataDir: dir });
    try {
      await expect
        .poll(async () => (await overlayState(app))?.visible ?? false, { timeout: 30_000 })
        .toBe(true);
    } finally {
      await app.close();
    }
  }),
);

test(
  'saves working hours to preferences.json and shows them after a restart',
  withUserDataDir(async (dir) => {
    const file = join(dir, 'preferences.json');

    const first = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(first);
      await expect(form(page).getByRole('checkbox', { name: 'Only remind me during working hours' }))
        .not.toBeChecked();

      await form(page).getByRole('checkbox', { name: 'Only remind me during working hours' }).check();
      await form(page).getByRole('checkbox', { name: 'Saturday' }).check();
      await form(page).getByLabel('From').fill('08:30');
      await form(page).getByLabel('Until').fill('18:00');

      // A key press instead of a pointer click: see the note in settings.e2e.ts.
      const save = form(page).getByRole('button', { name: 'Save working hours' });
      await save.focus();
      await save.press('Enter');

      await expect(form(page).getByRole('status')).toHaveText('Working hours saved.');
      expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({
        schedule: { enabled: true, days: [1, 2, 3, 4, 5, 6], startMinute: 510, endMinute: 1080 },
      });
    } finally {
      await first.close();
    }

    const second = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(second);
      await expect(form(page).getByRole('checkbox', { name: 'Only remind me during working hours' }))
        .toBeChecked();
      await expect(form(page).getByRole('checkbox', { name: 'Saturday' })).toBeChecked();
      await expect(form(page).getByLabel('From')).toHaveValue('08:30');
      await expect(form(page).getByLabel('Until')).toHaveValue('18:00');
    } finally {
      await second.close();
    }
  }),
);

test(
  'refuses a schedule with no day and writes nothing',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);
      for (const name of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
        await form(page).getByRole('checkbox', { name }).uncheck();
      }
      const save = form(page).getByRole('button', { name: 'Save working hours' });
      await save.focus();
      await save.press('Enter');

      await expect(form(page).getByRole('alert')).toHaveText('Fix the highlighted fields to save.');
      await expect(form(page).getByText('Choose at least one day.')).toBeVisible();
      expect(existsSync(join(dir, 'preferences.json'))).toBe(false);
    } finally {
      await app.close();
    }
  }),
);

test(
  'main rejects an invalid schedule sent straight over IPC and writes nothing',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);
      // The form would stop this, so go around it: main must not trust the renderer.
      const reply = await page.evaluate(() =>
        window.eyerest?.saveSchedule({
          enabled: true,
          days: [],
          startMinute: 600,
          endMinute: 540,
        }),
      );
      expect(reply).toMatchObject({ ok: false });
      expect(existsSync(join(dir, 'preferences.json'))).toBe(false);
    } finally {
      await app.close();
    }
  }),
);
