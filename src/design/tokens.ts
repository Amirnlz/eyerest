/**
 * Design tokens: single source of truth. Step 2.1a covers color only.
 * Type, spacing, radius, elevation, motion and z-index join in later steps.
 *
 * Pattern: primitive palette (raw values) -> semantic tokens per theme (names the UI uses).
 * Components consume semantic tokens only, never palette steps.
 */

/** Achromatic scale. Equal r, g, b on every step: no hue anywhere. */
export const palette = {
  'neutral-0': '#FFFFFF',
  'neutral-50': '#F2F2F2',
  'neutral-75': '#F0F0F0',
  'neutral-100': '#E3E3E3',
  'neutral-150': '#EDEDED',
  'neutral-200': '#D4D4D4',
  'neutral-250': '#A0A0A0',
  'neutral-300': '#B3B3B3',
  'neutral-400': '#808080',
  'neutral-500': '#5C5C5C',
  'neutral-600': '#474747',
  'neutral-700': '#6E6E6E',
  'neutral-800': '#262626',
  'neutral-850': '#1F1F1F',
  'neutral-900': '#1A1A1A',
  'neutral-925': '#171717',
  'neutral-950': '#000000',
} as const;

export type PaletteName = keyof typeof palette;

/** Values a semantic token may hold: a palette reference or a literal alpha color (#rrggbbaa). */
export type TokenValue =
  | { readonly ref: PaletteName }
  | { readonly alpha: string };

export const colorTokenNames = [
  // Surfaces
  'canvas', // window and page background; neumorphic surfaces share it
  'surface', // raised panel; same tone as canvas, depth comes from shadow
  'surface-inset', // pressed or recessed areas
  // Text
  'text-primary',
  'text-secondary',
  // Boundaries and focus
  'border-strong', // control boundary, 3:1 non-text contrast
  'focus-ring',
  // Filled action (primary button)
  'accent',
  'on-accent',
  // Neumorphic light source pair, translucent
  'shadow-light',
  'shadow-dark',
  // Dim layer shown behind the overlay during a rest
  'scrim',
] as const;

export type ColorTokenName = (typeof colorTokenNames)[number];
export type ThemeName = 'light' | 'dark';
export type ThemeColors = Readonly<Record<ColorTokenName, TokenValue>>;

const ref = (name: PaletteName): TokenValue => ({ ref: name });
const alpha = (hex8: string): TokenValue => ({ alpha: hex8 });

export const themes: Readonly<Record<ThemeName, ThemeColors>> = {
  light: {
    canvas: ref('neutral-100'),
    surface: ref('neutral-100'),
    'surface-inset': ref('neutral-200'),
    'text-primary': ref('neutral-900'),
    'text-secondary': ref('neutral-600'),
    'border-strong': ref('neutral-400'),
    'focus-ring': ref('neutral-900'),
    accent: ref('neutral-800'),
    'on-accent': ref('neutral-50'),
    'shadow-light': alpha('#FFFFFFE6'),
    'shadow-dark': alpha('#00000026'),
    scrim: alpha('#00000066'),
  },
  dark: {
    canvas: ref('neutral-850'),
    surface: ref('neutral-850'),
    'surface-inset': ref('neutral-925'),
    'text-primary': ref('neutral-75'),
    'text-secondary': ref('neutral-300'),
    'border-strong': ref('neutral-700'),
    'focus-ring': ref('neutral-75'),
    accent: ref('neutral-150'),
    'on-accent': ref('neutral-850'),
    'shadow-light': alpha('#FFFFFF14'),
    'shadow-dark': alpha('#000000A6'),
    scrim: alpha('#00000066'),
  },
};

/** Resolve a token to a literal hex string (`#rrggbb` or `#rrggbbaa`). */
export function resolveToken(value: TokenValue): string {
  return 'ref' in value ? palette[value.ref] : value.alpha;
}

export type ContrastPair = {
  readonly foreground: ColorTokenName;
  readonly background: ColorTokenName;
  /** 4.5 for text (WCAG AA), 3 for non-text UI components and focus indicators. */
  readonly minRatio: 3 | 4.5;
  readonly use: string;
};

/**
 * Every foreground/background combination the UI is allowed to render.
 * The focus ring is always drawn outside the control with a gap, so it sits on `surface`,
 * never on `accent` (same tone in both themes by design).
 */
export const contrastPairs: readonly ContrastPair[] = [
  {
    foreground: 'text-primary',
    background: 'canvas',
    minRatio: 4.5,
    use: 'body text',
  },
  {
    foreground: 'text-primary',
    background: 'surface',
    minRatio: 4.5,
    use: 'panel text',
  },
  {
    foreground: 'text-primary',
    background: 'surface-inset',
    minRatio: 4.5,
    use: 'pressed text',
  },
  {
    foreground: 'text-secondary',
    background: 'canvas',
    minRatio: 4.5,
    use: 'helper text',
  },
  {
    foreground: 'text-secondary',
    background: 'surface',
    minRatio: 4.5,
    use: 'panel helper',
  },
  {
    foreground: 'text-secondary',
    background: 'surface-inset',
    minRatio: 4.5,
    use: 'pressed helper',
  },
  {
    foreground: 'on-accent',
    background: 'accent',
    minRatio: 4.5,
    use: 'primary button label',
  },
  {
    foreground: 'border-strong',
    background: 'surface',
    minRatio: 3,
    use: 'control boundary',
  },
  {
    foreground: 'focus-ring',
    background: 'surface',
    minRatio: 3,
    use: 'focus indicator',
  },
  {
    foreground: 'accent',
    background: 'surface',
    minRatio: 3,
    use: 'primary button edge',
  },
];
