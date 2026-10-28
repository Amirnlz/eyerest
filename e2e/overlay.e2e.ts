import { expect, test } from '@playwright/test';
import { isNativeWayland } from '../src/main/overlay/placement';
import { launchApp, overlayPage, overlayState } from './helpers';

/**
 * Smoke tests: launch the built app in fast mode and watch the real overlay
 * window. Fast mode timeline: warning at 15 s, rest at 20 s, rest ends at 25 s.
 * Run with `npm run e2e` (it builds first).
 *
 * The layout is forced per test, so both code paths are covered on any machine.
 */

const MARGIN = 16;
const TOLERANCE = 2;

test('positioned: overlay appears top-right during the rest, then disappears', async () => {
  // Native Wayland cannot position windows, so the geometry check does not apply there.
  test.skip(
    process.platform === 'linux' &&
      process.env['XDG_SESSION_TYPE'] === 'wayland',
    'native Wayland cannot position windows; the surface layout covers it',
  );

  const app = await launchApp('positioned');
  try {
    await expect
      .poll(async () => (await overlayState(app))?.visible, { timeout: 30_000 })
      .toBe(true);

    const shown = await overlayState(app);
    expect(shown).not.toBeNull();
    if (!shown) return;

    expect(shown.alwaysOnTop).toBe(true);

    const rightGap =
      shown.workArea.x +
      shown.workArea.width -
      (shown.bounds.x + shown.bounds.width);
    const topGap = shown.bounds.y - shown.workArea.y;
    expect(Math.abs(rightGap - MARGIN)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(topGap - MARGIN)).toBeLessThanOrEqual(TOLERANCE);

    await expect
      .poll(async () => (await overlayState(app))?.visible, { timeout: 30_000 })
      .toBe(false);
  } finally {
    await app.close();
  }
});

test('surface: window covers the work area and the panel is drawn top-right, then disappears', async () => {
  const app = await launchApp('surface');
  try {
    await expect
      .poll(async () => (await overlayState(app))?.visible, { timeout: 30_000 })
      .toBe(true);

    const shown = await overlayState(app);
    expect(shown).not.toBeNull();
    if (!shown) return;

    // The window covers the work area (compositors may shift it by a pixel or two).
    expect(
      Math.abs(shown.bounds.width - shown.workArea.width),
    ).toBeLessThanOrEqual(TOLERANCE);
    expect(
      Math.abs(shown.bounds.height - shown.workArea.height),
    ).toBeLessThanOrEqual(TOLERANCE);

    // The panel sits top-right inside the window: check it in the page.
    const page = overlayPage(app);
    expect(page).toBeDefined();
    if (!page) return;

    if (
      isNativeWayland(
        process.platform,
        process.env,
        process.env['EYEREST_OZONE'] ?? '',
      )
    ) {
      await expect(page.getByTestId('integrated-dim')).toBeVisible();
      await page.getByRole('button', { name: /skip/i }).click();
      await expect
        .poll(async () => (await overlayState(app))?.visible, { timeout: 5_000 })
        .toBe(false);
      return;
    }

    const panel = page.getByRole('region');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(
      Math.abs(viewportWidth - (box.x + box.width) - MARGIN),
    ).toBeLessThanOrEqual(
      TOLERANCE + 2, // panel border
    );
    expect(box.y).toBeLessThanOrEqual(MARGIN + TOLERANCE + 2);

    await expect
      .poll(async () => (await overlayState(app))?.visible, { timeout: 30_000 })
      .toBe(false);
  } finally {
    await app.close();
  }
});
