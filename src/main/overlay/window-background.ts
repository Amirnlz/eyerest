import { resolveToken, themes } from '../../design/tokens';
import type { OverlayLayout } from '../../shared/overlay-layout';

/** Fully transparent, in the `#rrggbbaa` form Electron accepts. */
export const TRANSPARENT_BACKGROUND = '#00000000';

/**
 * Native background color of the overlay window, shown before the renderer paints.
 *
 * - `surface` layout: the window covers the work area and must be see-through.
 * - `positioned` layout: the window is still opaque (the panel is not styled yet, and a
 *   transparent window needs per-platform checks on Windows and Linux X11). Its color is the
 *   theme's `canvas` token, so dark theme never flashes white. Step 3.1 makes this window
 *   transparent once the panel is a rounded `Surface`.
 */
export function overlayWindowBackground(
  layout: OverlayLayout,
  dark: boolean,
): string {
  if (layout === 'surface') return TRANSPARENT_BACKGROUND;
  return resolveToken(themes[dark ? 'dark' : 'light'].canvas);
}
