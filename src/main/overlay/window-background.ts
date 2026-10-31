/** Fully transparent, in the `#rrggbbaa` form Electron accepts. */
export const TRANSPARENT_BACKGROUND = '#00000000';

/**
 * Native background of the overlay window, shown before the renderer paints.
 *
 * Both layouts use a transparent window, so the rounded `Surface` is the only thing drawn and no
 * window-colored corners show. The panel's own color comes from the theme tokens in the
 * renderer, so there is nothing to keep in sync with the OS theme here.
 */
export const OVERLAY_WINDOW_BACKGROUND = TRANSPARENT_BACKGROUND;
