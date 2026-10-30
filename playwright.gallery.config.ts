import { defineConfig } from '@playwright/test';

/**
 * Component gallery checks: plain Chromium against the dev harness, no Electron.
 * `npm run e2e:gallery`. The Electron suite stays in `playwright.config.ts`.
 */
const PORT = 5199;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.gallery.ts',
  timeout: 30_000,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: 'chromium',
    viewport: { width: 1280, height: 1600 },
  },
  webServer: {
    command: `npm run dev:renderer -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/gallery.html`,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
