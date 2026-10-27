/**
 * Always-on-top levels, lowest to highest. Same names as Electron's
 * `setAlwaysOnTop(flag, level)`. Kept here, free of Electron imports, so the
 * z-order rule between the dim layer and the overlay is unit-testable.
 */
export const WINDOW_LEVELS = [
  'normal',
  'floating',
  'torn-off-menu',
  'modal-panel',
  'main-menu',
  'status',
  'pop-up-menu',
  'screen-saver',
] as const;

export type WindowLevel = (typeof WINDOW_LEVELS)[number];

/** Highest level: the overlay stays above fullscreen apps and above the dim layer. */
export const OVERLAY_LEVEL: WindowLevel = 'screen-saver';

/** One step below the overlay, still above ordinary apps. */
export const DIM_LEVEL: WindowLevel = 'pop-up-menu';

export function isLevelBelow(lower: WindowLevel, higher: WindowLevel): boolean {
  return WINDOW_LEVELS.indexOf(lower) < WINDOW_LEVELS.indexOf(higher);
}
