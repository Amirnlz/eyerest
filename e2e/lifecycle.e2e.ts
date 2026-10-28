import { spawn } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { launchApp } from './helpers';

/**
 * Lifecycle smoke tests: the app runs in the tray only, and a second launch
 * exits at once. Pause and Resume through the tray menu are covered by logic
 * tests: Playwright cannot click a native tray menu.
 */

test('launches with no visible window', async () => {
  const app = await launchApp('positioned');
  try {
    // Give the overlay, the dim layer and any stray window time to appear.
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    const visible = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed() && win.isVisible()).length,
    );
    expect(visible).toBe(0);
  } finally {
    await app.close();
  }
});

test('a second launch exits at once and shows nothing', async () => {
  const app = await launchApp('positioned');
  try {
    const executable = await app.evaluate(() => process.execPath);

    const exitCode = await new Promise<number | null>((resolve, reject) => {
      const second = spawn(executable, ['.', ...(process.env['CI'] ? ['--no-sandbox'] : [])], {
        stdio: 'ignore',
        env: { ...process.env, EYEREST_FAST: '1' },
      });
      const timer = setTimeout(() => {
        second.kill();
        reject(new Error('second instance did not exit within 15 s'));
      }, 15_000);
      second.on('exit', (code) => {
        clearTimeout(timer);
        resolve(code);
      });
      second.on('error', reject);
    });

    expect(exitCode).toBe(0);

    // The first instance is unaffected.
    const windows = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
    expect(windows).toBeGreaterThan(0);
  } finally {
    await app.close();
  }
});
