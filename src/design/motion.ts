/**
 * Motion tokens (Step 2.1d). Values follow the better-ui skill exactly.
 *
 * Principles:
 * - State changes use CSS transitions (they retarget when reversed), never keyframes.
 * - High-frequency feedback is at most 150ms. Expressive motion is for infrequent moments.
 * - Reduced motion keeps the opacity fade and neutralises movement, scale and blur through the
 *   effect tokens, so components need no per-component media query.
 */

/** milliseconds */
export const durations = {
  fast: 100, // hover, row highlight
  quick: 150, // press, exit
  base: 300, // enter, icon swap
  tick: 1000, // one scheduler tick: progress sweeps match it so they read as continuous
} as const;

export type DurationName = keyof typeof durations;

export const easings = {
  out: 'ease-out',
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  linear: 'linear', // progress sweeps only, never interactive state
} as const;

export type EasingName = keyof typeof easings;

export const effectNames = [
  'pressScale',
  'enterOffset',
  'exitOffset',
  'blur',
  'stagger',
] as const;

export type EffectName = (typeof effectNames)[number];

export type EffectUnit = '' | 'rem' | 'ms';

export const effectUnits: Readonly<Record<EffectName, EffectUnit>> = {
  pressScale: '',
  enterOffset: 'rem',
  exitOffset: 'rem',
  blur: 'rem',
  stagger: 'ms',
};

export const effects: Readonly<Record<EffectName, number>> = {
  pressScale: 0.96,
  enterOffset: 0.75, // 12px, translateY up into place
  exitOffset: -0.75, // fixed -12px, never the container height
  blur: 0.25, // 4px
  stagger: 100,
};

/** Values under `prefers-reduced-motion: reduce`: no movement, scale or blur; opacity fades. */
export const reducedEffects: Readonly<Record<EffectName, number>> = {
  pressScale: 1,
  enterOffset: 0,
  exitOffset: 0,
  blur: 0,
  stagger: 100,
};
