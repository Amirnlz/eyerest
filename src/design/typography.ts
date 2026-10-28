/**
 * Typography tokens (Step 2.1b). Theme independent.
 *
 * Font strategy: the CSP is `default-src 'self'`, so no remote fonts. The family token lists a
 * bundled face first, then a system stack, so the UI is correct before the font file is wired in.
 * Sizes are in rem so the OS font-size setting scales the UI.
 */

export const fontFamilies = {
  sans:
    "'Manrope Variable', 'Manrope', ui-sans-serif, system-ui, -apple-system, " +
    "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

export type FontFamilyName = keyof typeof fontFamilies;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
export type FontWeightName = keyof typeof fontWeights;

export const typeRoleNames = [
  'display',
  'title',
  'body',
  'label',
  'caption',
] as const;
export type TypeRoleName = (typeof typeRoleNames)[number];

export type TypeRole = {
  readonly family: FontFamilyName;
  readonly weight: FontWeightName;
  /** rem. Major-third-ish scale on a 1rem root. */
  readonly size: number;
  /** Unitless line height. */
  readonly lineHeight: number;
  /** em. Negative tightens large text; no tracked caps anywhere. */
  readonly letterSpacing: number;
  /** Fixed-width digits so a ticking countdown does not jitter. */
  readonly tabularNums: boolean;
};

export const typeRoles: Readonly<Record<TypeRoleName, TypeRole>> = {
  display: {
    family: 'sans',
    weight: 'semibold',
    size: 3,
    lineHeight: 1.05,
    letterSpacing: -0.03,
    tabularNums: true,
  },
  title: {
    family: 'sans',
    weight: 'semibold',
    size: 1.25,
    lineHeight: 1.3,
    letterSpacing: -0.01,
    tabularNums: false,
  },
  body: {
    family: 'sans',
    weight: 'regular',
    size: 0.9375,
    lineHeight: 1.5,
    letterSpacing: 0,
    tabularNums: false,
  },
  label: {
    family: 'sans',
    weight: 'semibold',
    size: 0.875,
    lineHeight: 1.25,
    letterSpacing: 0.005,
    tabularNums: false,
  },
  caption: {
    family: 'sans',
    weight: 'medium',
    size: 0.75,
    lineHeight: 1.4,
    letterSpacing: 0.01,
    tabularNums: false,
  },
};
