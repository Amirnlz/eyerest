import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { launchApp, overlayPage, overlayState, type App } from './helpers';

/**
 * Rest statistics against the real built app. Every test uses a private user data dir, so the real
 * `stats.json` is never read or written. Dates are built from the real local day, because the
 * packaged app cannot run on a fake clock.
 */

test.setTimeout(120_000);

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

function localDay(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

test(
  'shows seeded statistics in the settings window, newest first with a total',
  withUserDataDir(async (dir) => {
    writeFileSync(
      join(dir, 'stats.json'),
      JSON.stringify({
        version: 1,
        days: {
          [localDay(0)]: { taken: 3, skipped: 1, postponed: 0 },
          [localDay(-1)]: { taken: 2, skipped: 0, postponed: 4 },
        },
      }),
    );
    const app = await launchApp('positioned', {
      env: { ...OPEN_SETTINGS, EYEREST_IDLE: '0' },
      userDataDir: dir,
    });
    try {
      const page = await openSettings(app);
      const table = page.getByRole('table', { name: 'Statistics' });
      await expect(table).toBeVisible();

      const today = table.getByRole('row', { name: /^Today/ });
      await expect(today.getByRole('cell')).toHaveText(['3', '1', '0']);
      const yesterday = table.getByRole('row', { name: /^Yesterday/ });
      await expect(yesterday.getByRole('cell')).toHaveText(['2', '0', '4']);
      await expect(table.getByRole('row', { name: /^Total/ }).getByRole('cell')).toHaveText([
        '5',
        '1',
        '4',
      ]);
      // Seven day rows, the header and the total row.
      await expect(table.getByRole('row')).toHaveCount(9);
    } finally {
      await app.close();
    }
  }),
);

test(
  'shows the empty note when nothing has been recorded',
  withUserDataDir(async (dir) => {
    const app = await launchApp('positioned', { env: OPEN_SETTINGS, userDataDir: dir });
    try {
      const page = await openSettings(app);
      await expect(page.getByText('No rests recorded yet.')).toBeVisible();
    } finally {
      await app.close();
    }
  }),
);

test(
  'a skipped rest is written to stats.json, and a corrupt file is set aside',
  withUserDataDir(async (dir) => {
    // A broken file must not stop the app, and must not be overwritten.
    writeFileSync(join(dir, 'stats.json'), '{nope');

    const app = await launchApp('positioned', { userDataDir: dir });
    try {
      await expect
        .poll(async () => (await overlayState(app))?.visible ?? false, { timeout: 30_000 })
        .toBe(true);
      const page = overlayPage(app);
      if (!page) throw new Error('overlay page not found');

      const skip = page.getByRole('button', { name: /skip/i });
      await expect(skip).toBeVisible({ timeout: 15_000 });
      await skip.click();

      const file = join(dir, 'stats.json');
      await expect.poll(() => existsSync(file) && readFileSync(file, 'utf8').includes('skipped'), {
        timeout: 10_000,
      }).toBe(true);
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({
        version: 1,
        days: { [localDay(0)]: { taken: 0, skipped: 1, postponed: 0 } },
      });
      expect(readFileSync(`${file}.bad`, 'utf8')).toBe('{nope');
    } finally {
      await app.close();
    }
  }),
);
