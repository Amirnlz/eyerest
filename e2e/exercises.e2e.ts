import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { IPC } from '../src/shared/ipc';
import { copy } from '../src/renderer/copy';
import { launchApp, overlayPage, type App } from './helpers';

/**
 * Guided eye exercises on the real built app. Fast mode: the rest starts at 20 s and lasts 5 s,
 * so the three prompts show for about two seconds each. Playwright cannot click a native tray
 * menu, so the saved choice is seeded in `preferences.json` and a tray change is simulated by
 * pushing on the exercises channel from main, which is exactly what the tray does. Every test uses
 * a private user data dir, so the real `preferences.json` is untouched.
 */

test.setTimeout(90_000);

const PROMPTS = [
  copy.exercises['look-far'].prompt,
  copy.exercises.roll.prompt,
  copy.exercises.blink.prompt,
];

async function withApp(
  run: (app: App, page: Page) => Promise<void>,
  preferences?: Record<string, unknown>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'eyerest-e2e-'));
  if (preferences) writeFileSync(join(dir, 'preferences.json'), JSON.stringify(preferences));
  const app = await launchApp('positioned', { userDataDir: dir });
  try {
    await expect.poll(() => overlayPage(app) !== undefined, { timeout: 20_000 }).toBe(true);
    const page = overlayPage(app);
    if (!page) throw new Error('overlay page not found');
    await run(app, page);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Records every distinct text the panel shows, in order, from the page's own DOM. */
async function recordTexts(page: Page, candidates: readonly string[]) {
  await page.evaluate((texts) => {
    const seen: string[] = [];
    Reflect.set(window, '__seen', seen);
    const check = () => {
      const body = document.body.innerText;
      for (const text of texts) {
        if (body.includes(text) && seen[seen.length - 1] !== text) seen.push(text);
      }
    };
    new MutationObserver(check).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    check();
  }, candidates);
}

const seen = (page: Page) => page.evaluate(() => Reflect.get(window, '__seen') as string[]);

test('the eye rest shows look far, roll, blink in order, with the countdown and both buttons', async () => {
  await withApp(async (_app, page) => {
    await recordTexts(page, PROMPTS);
    await expect(page.getByRole('timer')).toBeVisible({ timeout: 40_000 });
    await expect.poll(() => seen(page), { timeout: 15_000 }).toEqual(PROMPTS);
  });
});

test('the panel keeps Skip and Postpone and does not overflow with an exercise showing', async () => {
  await withApp(async (_app, page) => {
    await expect(page.getByText(PROMPTS[0] ?? '')).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole('button', { name: /skip/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /postpone/i })).toBeVisible();
    const fits = await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= window.innerHeight &&
        document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits).toBe(true);
  });
});

test('Skip still ends an eye rest that shows an exercise', async () => {
  await withApp(async (_app, page) => {
    await expect(page.getByText(PROMPTS[0] ?? '')).toBeVisible({ timeout: 40_000 });
    await page.getByRole('button', { name: /skip/i }).click();
    await expect(page.getByRole('timer')).toBeHidden();
  });
});

test('saved off: the static message stays for the whole rest', async () => {
  await withApp(
    async (_app, page) => {
      await recordTexts(page, [...PROMPTS, copy.rest.eye.message]);
      await expect(page.getByText(copy.rest.eye.message)).toBeVisible({ timeout: 40_000 });
      await page.waitForTimeout(3_000);
      expect(await seen(page)).toEqual([copy.rest.eye.message]);
    },
    { exercises: false },
  );
});

test('a tray change pushed from main switches the open overlay', async () => {
  await withApp(async (app, page) => {
    await expect(page.getByText(copy.rest.eye.message)).toHaveCount(0);
    await app.evaluate(
      ({ BrowserWindow }, channel) => {
        for (const window of BrowserWindow.getAllWindows()) {
          if (!window.isDestroyed()) window.webContents.send(channel as string, false);
        }
      },
      IPC.exercises.channel,
    );
    await expect(page.getByText(copy.rest.eye.message)).toBeVisible({ timeout: 40_000 });
  });
});
