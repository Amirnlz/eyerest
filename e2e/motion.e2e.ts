import { expect, test } from '@playwright/test';
import { launchApp, overlayPage, overlayState } from './helpers';

/**
 * The entrance runs in the real renderer. Fast mode: the warning appears at 15 s. These tests read
 * computed styles, which jsdom cannot, so they are the only check that the CSS reaches the page.
 */

test('warning panel runs the staggered entrance, and reduced motion keeps only a fade', async () => {
  const app = await launchApp('positioned');
  try {
    await expect
      .poll(async () => (await overlayState(app))?.visible, { timeout: 30_000 })
      .toBe(true);

    const page = overlayPage(app);
    expect(page).toBeDefined();
    if (!page) return;

    const title = page.getByRole('heading', { level: 2 });
    await expect(title).toBeVisible();

    const chunkStyles = await page.$$eval('.er-overlay-panel__chunk', (nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return { name: style.animationName, delay: style.animationDelay };
      }),
    );
    expect(chunkStyles).toHaveLength(3);
    for (const chunk of chunkStyles) expect(chunk.name).toBe('er-overlay-panel-enter');
    expect(chunkStyles.map((chunk) => chunk.delay)).toEqual(['0s', '0.1s', '0.2s']);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        offset: root.getPropertyValue('--er-motion-enter-offset').trim(),
        blur: root.getPropertyValue('--er-motion-blur').trim(),
      };
    });
    expect(reduced).toEqual({ offset: '0rem', blur: '0rem' });
  } finally {
    await app.close();
  }
});
