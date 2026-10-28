/**
 * Spacing, radius and z-index tokens (Step 2.1c). Theme independent. All lengths in rem.
 *
 * Radius rule (better-ui): outer radius = inner radius + padding (+ border width), for a visible,
 * even inset up to 24px (1.5rem) of padding. `concentricPairs` encodes every nesting we allow.
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

export type ConcentricPair = {
  readonly outer: RadiusName;
  readonly inner: RadiusName;
  readonly padding: SpaceName;
};

/** Allowed nestings: outer radius must equal inner radius plus the padding between them. */
export const concentricPairs: readonly ConcentricPair[] = [
  { outer: 'lg', inner: 'md', padding: 2 }, // panel around a control
  { outer: 'md', inner: 'sm', padding: 2 }, // control around an icon chip
];

/** Layers inside one window. The dim layer is a separate window below the overlay window. */
export const zIndex = {
  base: 0,
  raised: 10,
  overlay: 100,
} as const;

export type ZIndexName = keyof typeof zIndex;
