/**
 * Spacing, radius and z-index tokens (Step 2.1c). Theme independent. All lengths in rem.
 *
 * Radius rule (better-ui): outer radius = inner radius + padding + border width, for a child that
 * fills its parent's content box with a visible, even inset up to 24px (1.5rem). `Surface.css`
 * implements it at runtime with calc(), so the border width is always exact.
 */

/** 4px grid expressed in rem. Keys are step numbers (1 step = 0.25rem). */
export const space = {
  0: 0,
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1,
  5: 1.25,
  6: 1.5,
  8: 2,
  10: 2.5,
  12: 3,
} as const;

export type SpaceName = keyof typeof space;

export const radius = {
  sm: 0.5,
  md: 1,
  lg: 1.5,
} as const;

export type RadiusName = keyof typeof radius;

/** Pill and circle shapes. A length, not a rem step, so it never overflows a scale comparison. */
export const radiusFull = '9999px';

/**
 * Line widths. These stay in px on purpose: a rem hairline blurs when the font size scales.
 * Components reference them by variable, so no px literal appears in component CSS.
 */
export const stroke = {
  hairline: '1px',
  focus: '2px',
  focusOffset: '3px',
} as const;

export type StrokeName = keyof typeof stroke;

/**
 * Optical alignment (better-ui): geometric centering can look off, so a nudge is applied by eye.
 * `nudge` is the padding a button gives up on its icon side. A starting point, not a law.
 */
export const optical = {
  nudge: 0.125,
} as const;

export type OpticalName = keyof typeof optical;

export const opacity = {
  disabled: 0.5,
} as const;

export type OpacityName = keyof typeof opacity;

/** Layers inside one window. The dim layer is a separate window below the overlay window. */
export const zIndex = {
  base: 0,
  raised: 10,
  overlay: 100,
} as const;

export type ZIndexName = keyof typeof zIndex;
