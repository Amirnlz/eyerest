import { defineConfig } from 'vitest/config';

// Logic tests run in node. UI tests (*.test.tsx) opt in to jsdom with a
// `// @vitest-environment jsdom` comment on their first line.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
