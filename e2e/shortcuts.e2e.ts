import { expect, test } from '@playwright/test';
import { launchApp, overlayPage, overlayState, type App } from './helpers';

/**
 * Global shortcuts against the real built app. Playwright cannot press an OS-wide key, so this
 * checks what the OS was asked for (`globalShortcut.isRegistered`) and what the overlay shows; the
 * key-to-action path is covered by the logic tests with a fake shortcut table. X11 is forced on
 * Linux with EYEREST_OZONE: native Wayland has no global key grab, so the feature is off there.
 *
 * Fast mode timeline: warning at 5 s, rest at 20 s, rest ends at 25 s.
 */

test.setTimeout(120_000);

const SKIP_KEY = 'CommandOrControl+Alt+Shift+S';
const POSTPONE_KEY = 'CommandOrControl+Alt+Shift+P';
const SKIP_LABEL = process.platform === 'darwin' ? '⌥⇧⌘S' : 'Ctrl+Alt+Shift+S';

const launch = () => launchApp('positioned', { env: { EYEREST_OZONE: 'x11' } });

const registered = (app: App) =>
  app.evaluate(
    ({ globalShortcut }, keys) => keys.map((key) => globalShortcut.isRegistered(key)),
    [SKIP_KEY, POSTPONE_KEY],
  );

test('holds the keys only while a rest is showing', async () => {
  const app = await launch();
  try {
    const visible = async () => (await overlayState(app))?.visible ?? false;

    // Work: nothing is taken from other apps.
    expect(await registered(app)).toEqual([false, false]);

    // Heads-up: the overlay is up, but Skip and Postpone are not valid yet, so no key.
    await expect.poll(visible, { timeout: 30_000 }).toBe(true);
    const page = overlayPage(app);
    if (!page) throw new Error('overlay page not found');
    await expect(page.getByRole('button', { name: /skip/i })).toHaveCount(0);
    expect(await registered(app)).toEqual([false, false]);

    // Rest: both keys held, and the buttons offer them.
    const skip = page.getByRole('button', { name: /skip/i });
    await expect(skip).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => registered(app), { timeout: 5_000 }).toEqual([true, true]);
    await expect(skip).toHaveAttribute('title', `Shortcut: ${SKIP_LABEL}`);
    await expect(skip).toHaveAccessibleDescription(`Shortcut: ${SKIP_LABEL}`);

    // Skip by button: the keys are released with the rest.
    await skip.click();
    await expect.poll(visible, { timeout: 5_000 }).toBe(false);
    await expect.poll(() => registered(app), { timeout: 5_000 }).toEqual([false, false]);
  } finally {
    await app.close();
  }
});

test('releases the keys when the rest runs out by itself', async () => {
  const app = await launch();
  try {
    await expect.poll(() => registered(app), { timeout: 40_000 }).toEqual([true, true]);
    await expect.poll(() => registered(app), { timeout: 15_000 }).toEqual([false, false]);
  } finally {
    await app.close();
  }
});
