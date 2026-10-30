import { expect, test } from '@playwright/test';
import { resolveToken, themes } from '../src/design/tokens';
import { launchApp, overlayPage, overlayState } from './helpers';

/**
 * The real renderer follows the OS color scheme. Playwright emulates the OS setting, which fires
 * the same `change` event the app listens to. Fast mode shows the overlay at 15 s.
 */

const canvas = (page: NonNullable<ReturnType<typeof overlayPage>>) =>
  page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--er-color-canvas').trim(),
  );

test('overlay follows the OS color scheme and restores transitions afterwards', async () => {
  const app = await launchApp('positioned');
  try {
    await expect
      .poll(async () => (await overlayState(app))?.visible, { timeout: 30_000 })
      .toBe(true);

    const page = overlayPage(app);
    expect(page).toBeDefined();
    if (!page) return;

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => canvas(page)).toBe(resolveToken(themes.dark.canvas));

    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => canvas(page)).toBe(resolveToken(themes.light.canvas));

    // Following the OS never writes an override attribute.
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);

    // The temporary rule is gone again after two frames.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            [...document.head.querySelectorAll('style')].filter((style) =>
              style.textContent?.includes('transition:none'),
            ).length,
        ),
      )
      .toBe(0);
  } finally {
    await app.close();
  }
});
