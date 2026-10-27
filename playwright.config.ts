import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 90_000,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
});
