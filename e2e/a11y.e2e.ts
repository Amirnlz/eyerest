import { expect, test } from '@playwright/test';
import { launchApp, overlayPage, overlayState } from './helpers';

/**
 * Real-app accessibility checks. Fast mode shows the warning first, then the rest. jsdom cannot
 * tell whether the overlay window took focus from the user's app, so this runs in the app.
 */

test('announces the phases politely and never moves focus into the overlay', async () => {
  const app = await launchApp('positioned');
  try {
    await expect
      .poll(async () => (await overlayState(app))?.visible, { timeout: 30_000 })
      .toBe(true);

    const page = overlayPage(app);
    expect(page).toBeDefined();
    if (!page) return;

    const status = page.getByRole('status');
    await expect(status).toHaveText(/^Eye rest starts in \d+ seconds?\.$/);

    // Warning has no actions and the status region is not focusable.
    await expect(page.getByRole('button')).toHaveCount(0);

    await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible({ timeout: 30_000 });
    await expect(status).toHaveText(/^Rest your eyes for \d+ seconds?\.$/);

    // The overlay opens without focus: no control is active, and the window is not focused.
    const active = await page.evaluate(() => document.activeElement?.tagName);
    expect(active).toBe('BODY');
    const focused = await app.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some(
          (win) =>
            !win.isDestroyed() &&
            !win.webContents.getURL().startsWith('data:') &&
            win.isFocused(),
        ),
    );
    expect(focused).toBe(false);
  } finally {
    await app.close();
  }
});
