/**
 * Overlay panel geometry shared by the main process (window bounds) and the
 * renderer (CSS position when the window is a full work-area surface).
 * Values are in device-independent pixels.
 */
export const OVERLAY_SIZE = Object.freeze({ width: 360, height: 220 });
export const OVERLAY_MARGIN = 16;

/**
 * How the overlay window is laid out:
 * - `positioned`: a small window placed at the top-right by the app.
 * - `surface`: a transparent window covering the display's work area, with the
 *   panel drawn at the top-right by CSS. Used where apps cannot choose their
 *   own window position (native Wayland).
 */
export type OverlayLayout = 'positioned' | 'surface';

export function isOverlayLayout(value: unknown): value is OverlayLayout {
  return value === 'positioned' || value === 'surface';
}
