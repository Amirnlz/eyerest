import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { launchApp, overlayPage, type App } from './helpers';

/**
 * Sound cue smoke tests against the real built app. A headless run cannot hear audio, so the
 * overlay page's `HTMLMediaElement.play` is wrapped to record each call and whether the browser
 * accepted it (this is what catches a blocked autoplay policy). The sound files themselves are
 * checked in `tests/main/sound-assets.test.ts`. Fast mode: rest starts at 20 s, a full rest ends
 * at 25 s. Every test uses a private user data dir, so the real `preferences.json` is untouched.
 */

test.setTimeout(90_000);

interface Play {
  readonly src: string;
  readonly volume: number;
  readonly settled: string;
}

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
    await page.evaluate(() => {
      const plays: Play[] = [];
      Reflect.set(window, '__plays', plays);
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
        const entry = { src: this.currentSrc || this.src, volume: this.volume, settled: 'pending' };
        plays.push(entry);
        const result = original.call(this);
        result.then(
          () => {
            entry.settled = 'resolved';
          },
          (error: unknown) => {
            entry.settled = `rejected: ${String(error)}`;
          },
        );
        return result;
      };
    });
    await run(app, page);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const plays = (page: Page) => page.evaluate(() => Reflect.get(window, '__plays') as Play[]);

test('plays the start cue at rest start and the end cue when the rest runs out', async () => {
  await withApp(async (_app, page) => {
    await expect.poll(async () => (await plays(page)).length, { timeout: 40_000 }).toBe(1);
    const [start] = await plays(page);
    expect(start?.src).toContain('rest-start');
    expect(start?.volume).toBe(0.5);
    await expect.poll(async () => (await plays(page))[0]?.settled).toBe('resolved');

    await expect.poll(async () => (await plays(page)).length, { timeout: 15_000 }).toBe(2);
    const [, end] = await plays(page);
    expect(end?.src).toContain('rest-end');
    await expect.poll(async () => (await plays(page))[1]?.settled).toBe('resolved');
  });
});

test('Skip ends the rest with no end cue', async () => {
  await withApp(async (_app, page) => {
    await expect.poll(async () => (await plays(page)).length, { timeout: 40_000 }).toBe(1);
    const skip = page.getByRole('button', { name: /skip/i });
    await expect(skip).toBeVisible({ timeout: 5_000 });
    await skip.press('Enter');
    await expect(skip).toHaveCount(0);

    // The skipped rest would have ended 5 s after it began. Wait past that.
    await page.waitForTimeout(7_000);
    expect((await plays(page)).map((play) => play.src)).toHaveLength(1);
  });
});

test('muted in preferences.json: nothing plays', async () => {
  await withApp(
    async (_app, page) => {
      const skip = page.getByRole('button', { name: /skip/i });
      await expect(skip).toBeVisible({ timeout: 40_000 });
      await page.waitForTimeout(8_000); // past the rest start and the rest end
      expect(await plays(page)).toEqual([]);
    },
    { soundMuted: true },
  );
});

test('volume from preferences.json is used', async () => {
  await withApp(
    async (_app, page) => {
      await expect.poll(async () => (await plays(page)).length, { timeout: 40_000 }).toBe(1);
      expect((await plays(page))[0]?.volume).toBe(0.25);
    },
    { soundVolume: 'low' },
  );
});
