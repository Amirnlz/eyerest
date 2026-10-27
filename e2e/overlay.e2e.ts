import { _electron as electron, expect, test } from '@playwright/test';

/**
 * Smoke test: launches the built app in fast mode and watches the real
 * overlay window. Fast mode timeline: warning at 15 s, rest at 20 s, rest
 * ends at 25 s. Run with `npm run e2e` (it builds first).
 */
test('overlay appears top-right above other windows during the rest, then disappears', async () => {
  const app = await electron.launch({
    args: ['.', ...(process.env['CI'] ? ['--no-sandbox'] : [])],
    env: { ...process.env, EYEREST_FAST: '1' } as Record<string, string>,
  });

  const overlayState = () =>
    app.evaluate(({ BrowserWindow, screen }) => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win || win.isDestroyed()) return null;
      return {
        visible: win.isVisible(),
        alwaysOnTop: win.isAlwaysOnTop(),
        bounds: win.getBounds(),
        workArea: screen.getPrimaryDisplay().workArea,
      };
    });

  try {
    // Appears when the warning starts.
    await expect.poll(async () => (await overlayState())?.visible, { timeout: 30_000 }).toBe(true);

    const shown = await overlayState();
    expect(shown).not.toBeNull();
    if (!shown) return;

    expect(shown.alwaysOnTop).toBe(true);

    // Top-right of the primary work area, 16 px margin (small tolerance for rounding).
    const margin = 16;
    const rightGap = shown.workArea.x + shown.workArea.width - (shown.bounds.x + shown.bounds.width);
    const topGap = shown.bounds.y - shown.workArea.y;
    expect(Math.abs(rightGap - margin)).toBeLessThanOrEqual(2);
    expect(Math.abs(topGap - margin)).toBeLessThanOrEqual(2);

    // Disappears when the rest ends.
    await expect.poll(async () => (await overlayState())?.visible, { timeout: 30_000 }).toBe(false);
  } finally {
    await app.close();
  }
});
