import { expect, test } from '@playwright/test';
import { OVERLAY_SIZE } from '../../src/shared/overlay-layout';
import { openGallery, themeNames } from './gallery-helpers';

/**
 * The overlay at the real window size (360 by 220). If its content does not fit, the window would
 * clip it, so the fix is a larger OVERLAY_SIZE or tighter content, never a hidden overflow.
 */

const frames = ['warning', 'eye-rest', 'long-rest'] as const;

for (const theme of themeNames) {
  for (const id of frames) {
    test(`${id} fits the ${OVERLAY_SIZE.width} by ${OVERLAY_SIZE.height} window (${theme})`, async ({ page }) => {
      await openGallery(page, theme);
      const frame = page.getByTestId(`frame-${id}`);
      await expect(frame.getByRole('region')).toBeVisible();
      // The entrance shifts chunks by 12px; measure after it has finished.
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)).then(() => undefined));

      const metrics = await frame.evaluate((element) => {
        const body = element.querySelector('.er-overlay-panel__body');
        const surface = element.querySelector('section');
        if (!body || !surface) throw new Error('overlay panel not rendered');
        const frameBox = element.getBoundingClientRect();
        const surfaceBox = surface.getBoundingClientRect();
        return {
          overflowY: body.scrollHeight - body.clientHeight,
          overflowX: body.scrollWidth - body.clientWidth,
          surfaceHeight: surfaceBox.height,
          surfaceBottom: surfaceBox.bottom - frameBox.bottom,
          surfaceRight: surfaceBox.right - frameBox.right,
        };
      });

      expect(metrics.overflowY, 'content taller than the panel').toBeLessThanOrEqual(0);
      expect(metrics.overflowX, 'content wider than the panel').toBeLessThanOrEqual(0);
      // One pixel of tolerance for fractional layout.
      expect(metrics.surfaceHeight).toBeLessThanOrEqual(OVERLAY_SIZE.height + 1);
      expect(metrics.surfaceBottom).toBeLessThanOrEqual(1);
      expect(metrics.surfaceRight).toBeLessThanOrEqual(1);
    });
  }
}

test('the rest actions stay inside the panel and are both visible', async ({ page }) => {
  await openGallery(page, 'light');
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)).then(() => undefined));
  const frame = page.getByTestId('frame-long-rest');
  const frameBox = await frame.boundingBox();
  for (const name of ['Skip', 'Postpone']) {
    const box = await frame.getByRole('button', { name }).boundingBox();
    expect(box, name).not.toBeNull();
    if (!box || !frameBox) continue;
    expect(box.y + box.height, name).toBeLessThanOrEqual(frameBox.y + frameBox.height);
    expect(box.x + box.width, name).toBeLessThanOrEqual(frameBox.x + frameBox.width);
  }
});

test('the warning has the three entrance chunks and the rest has actions in the last one', async ({ page }) => {
  await openGallery(page, 'light');
  await expect(page.getByTestId('frame-warning').locator('.er-overlay-panel__chunk')).toHaveCount(3);
  await expect(
    page.getByTestId('frame-eye-rest').locator('.er-overlay-panel__chunk--2').getByRole('button'),
  ).toHaveCount(2);
});
