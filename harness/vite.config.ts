import { defineConfig } from 'vite';
import { designCssPlugin } from '../src/design/vite-plugin';

// Config for `npm run dev:renderer` (vite harness). Not shipped.
export default defineConfig({
  plugins: [designCssPlugin()],
});
