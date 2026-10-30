import { designFonts } from '../design/fonts';
import { loadDesignFonts } from './fonts';

/**
 * Vite resolves the glob at build time. With no font file present it is an empty object, so the
 * build never fails and the app uses the system fallback stack.
 */
const urls = import.meta.glob<string>('./assets/fonts/*.woff2', {
  query: '?url',
  import: 'default',
  eager: true,
});

/** Call once at startup, before first render. Safe to fire and forget. */
export function loadBundledFonts(): Promise<number> {
  return loadDesignFonts({
    urls,
    fonts: designFonts,
    createFace: (family, source, descriptors) =>
      new FontFace(family, source, descriptors),
    fontSet: document.fonts,
    onError: (family, error) => {
      console.warn(`[fonts] could not load ${family}`, error);
    },
  });
}
