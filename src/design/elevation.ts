/**
 * Neumorphic elevation tokens (Step 2.1c). Light source is top-left.
 * A raised level is a light shadow up-left plus a dark shadow down-right; an inset level is the
 * same pair inside the surface. Shadow colors come from the theme tokens `shadow-light` and
 * `shadow-dark`, so one definition serves both themes.
 *
 * Depth only: nothing readable or operable may rely on a shadow (see contrast tokens).
 * Forced-colors mode removes box-shadow, so components keep `border: 1px solid transparent`.
 */

export type ElevationKind = 'raised' | 'inset';

export type Elevation = {
  readonly kind: ElevationKind;
  /** rem. Distance of each shadow from the edge, per axis. */
  readonly offset: number;
  /** rem. Blur radius. */
  readonly blur: number;
};

export const elevationNames = [
  'raised-sm',
  'raised-md',
  'raised-lg',
  'inset-sm',
  'inset-md',
] as const;

export type ElevationName = (typeof elevationNames)[number];

export const elevations: Readonly<Record<ElevationName, Elevation>> = {
  'raised-sm': { kind: 'raised', offset: 0.25, blur: 0.5 },
  'raised-md': { kind: 'raised', offset: 0.5, blur: 1 },
  'raised-lg': { kind: 'raised', offset: 0.75, blur: 1.5 },
  'inset-sm': { kind: 'inset', offset: 0.125, blur: 0.25 },
  'inset-md': { kind: 'inset', offset: 0.25, blur: 0.5 },
};
