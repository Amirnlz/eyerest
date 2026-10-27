import { expect, test } from '@playwright/test';
import { dimState, launchApp, overlayPage } from './helpers';

/**
 * Smoke tests for the dim layer. Fast mode timeline: warning at 15 s, rest at
 * 20 s, rest ends at 25 s.
 */

const TOLERANCE = 2;

const allVisible = async (app: Awaited<ReturnType<typeof launchApp>>) => {
  const { windows, displays } = await dimState(app);
  return windows.length === displays.length && windows.every((w) => w.visible);
};

const noneVisible = async (app: Awaited<ReturnType<typeof launchApp>>) =>
  (await dimState(app)).windows.every((w) => !w.visible);

test('dim windows cover every display during the rest, then disappear', async () => {
  const app = await launchApp('positioned');
  try {
    // Hidden while working.
    expect(await noneVisible(app)).toBe(true);

    await expect.poll(() => allVisible(app), { timeout: 30_000 }).toBe(true);

    const { windows, displays } = await dimState(app);
    expect(windows).toHaveLength(displays.length);
    expect(windows.every((w) => w.alwaysOnTop)).toBe(true);

    // Native Wayland cannot position windows, so the geometry check does not apply there.
    const nativeWayland =
      process.platform === 'linux' &&
      process.env['XDG_SESSION_TYPE'] === 'wayland';
    if (!nativeWayland) {
      for (const display of displays) {
        expect(
          windows.some(
            (w) =>
              Math.abs(w.bounds.x - display.x) <= TOLERANCE &&
              Math.abs(w.bounds.y - display.y) <= TOLERANCE &&
              Math.abs(w.bounds.width - display.width) <= TOLERANCE &&
              Math.abs(w.bounds.height - display.height) <= TOLERANCE,
          ),
        ).toBe(true);
      }
    }

    await expect.poll(() => noneVisible(app), { timeout: 30_000 }).toBe(true);
  } finally {
    await app.close();
  }
});

test('skip removes the dim immediately', async () => {
  const app = await launchApp('positioned');
  try {
    await expect.poll(() => allVisible(app), { timeout: 30_000 }).toBe(true);

    const page = overlayPage(app);
    expect(page).toBeDefined();
    if (!page) return;

    await page.getByRole('button', { name: /skip/i }).click();

    await expect.poll(() => noneVisible(app), { timeout: 5_000 }).toBe(true);
  } finally {
    await app.close();
  }
});
