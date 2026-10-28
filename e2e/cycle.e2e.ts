import { expect, test } from '@playwright/test';
import { dimState, launchApp, overlayPage, overlayState } from './helpers';

/**
 * Full fast-mode cycle on the real app: warning (15 s), rest (20 s), Skip,
 * then the next work period. Fast mode timeline: warning at 15 s, rest at
 * 20 s, rest ends at 25 s; after a skip the next rest is 20 s later.
 */

test.setTimeout(150_000);

test('full cycle: warning, rest, skip, next work period', async () => {
  const app = await launchApp('positioned');
  try {
    const overlayVisible = async () => (await overlayState(app))?.visible ?? false;
    const dimVisible = async () => (await dimState(app)).windows.some((w) => w.visible);

    // Work period: nothing on screen.
    expect(await overlayVisible()).toBe(false);
    expect(await dimVisible()).toBe(false);

    // Warning: overlay shows the notice, with no Skip or Postpone and no dim.
    await expect.poll(overlayVisible, { timeout: 30_000 }).toBe(true);
    const page = overlayPage(app);
    expect(page).toBeDefined();
    if (!page) return;
    await expect(page.getByRole('timer')).toBeVisible();
    await expect(page.getByRole('button', { name: /skip/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /postpone/i })).toHaveCount(0);
    expect(await dimVisible()).toBe(false);

    // Rest: dim on, Skip and Postpone available.
    const skip = page.getByRole('button', { name: /skip/i });
    await expect(skip).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /postpone/i })).toBeVisible();
    await expect.poll(dimVisible, { timeout: 5_000 }).toBe(true);

    // Skip: everything goes away at once.
    await skip.click();
    await expect.poll(overlayVisible, { timeout: 5_000 }).toBe(false);
    await expect.poll(dimVisible, { timeout: 5_000 }).toBe(false);

    // Next work period: still quiet well inside the 15 s before the next warning...
    await new Promise((resolve) => setTimeout(resolve, 8_000));
    expect(await overlayVisible()).toBe(false);
    expect(await dimVisible()).toBe(false);

    // ...and the cycle comes round again with the next warning.
    await expect.poll(overlayVisible, { timeout: 30_000 }).toBe(true);
  } finally {
    await app.close();
  }
});
