# Design brief

Status: Step 2.1a (color tokens) awaiting approval. Other token groups follow in later 2.1 sub-steps.

## Direction

Soft neumorphism. Surfaces share the canvas tone; depth comes from a paired light and dark shadow.
Palette is achromatic: pure neutral steps from white to black, no hue. Light and dark themes.

## Color

Source: `src/design/tokens.ts`. CSS custom properties: `buildColorCss()` in `src/design/css.ts`,
prefix `--er-color-*`. Components use semantic tokens only, never palette steps.

| Token | Role |
| ----- | ---- |
| `canvas`, `surface` | Page and panel. Same tone. |
| `surface-inset` | Pressed or recessed. |
| `text-primary`, `text-secondary` | Text, AA 4.5:1 on every surface. |
| `border-strong` | Control boundary, 3:1. |
| `focus-ring` | Drawn outside the control with a gap, on `surface`, 3:1. |
| `accent`, `on-accent` | Filled primary action. Inverts per theme. |
| `shadow-light`, `shadow-dark` | Neumorphic light-source pair, translucent. |
| `scrim` | Dim layer behind the overlay during a rest. |

Rule: neumorphic shadows carry depth only. Anything that must be read or operated (text, control
edges, focus) meets WCAG AA through the tokens above, not through shadow.

Theme selection: `data-theme="light|dark"` forces a theme; without it, `prefers-color-scheme` decides,
light by default.

## Typography

Source: `src/design/typography.ts`. CSS: `buildTypeCss()` (`--er-font-family-*`, `--er-type-<role>-*`).
`buildDesignCss()` in `src/design/build.ts` is the single entry that concatenates every token block.

| Role | Size | Weight | Use |
| ---- | ---- | ------ | --- |
| `display` | 3rem | 600 | Countdown. Tabular numerals. |
| `title` | 1.25rem | 600 | Panel heading. |
| `body` | 0.9375rem | 400 | Messages. Line height 1.5. |
| `label` | 0.875rem | 600 | Buttons. |
| `caption` | 0.75rem | 500 | Helper text. |

Family: Manrope (variable, bundled, OFL) first, system sans stack as fallback. No remote fonts: the CSP
is `default-src 'self'`. Font file wiring is a separate step because it adds a dependency.
Sizes in rem. No tracked all-caps text.

## Spacing, radius, z-index

Source: `src/design/layout.ts`. CSS: `buildLayoutCss()`.

- Space: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12 (1 step = 0.25rem, 4px grid). `--er-space-<n>`.
- Radius: `sm` 0.5rem, `md` 1rem, `lg` 1.5rem, `full` 9999px. `--er-radius-<name>`.
- Concentric rule: outer = inner + padding. Declared nestings: `lg` = `md` + space-2 (panel around a
  control), `md` = `sm` + space-2 (control around an icon chip). Tests enforce them.
- z-index: `base` 0, `raised` 10, `overlay` 100. The dim layer is a separate window below the overlay.

## Elevation

Source: `src/design/elevation.ts`. CSS: `buildElevationCss()`, `--er-elevation-<name>`.

Light source top-left. Each level is two layers: `shadow-light` up-left, `shadow-dark` down-right.
Levels: `flat`, `raised-sm|md|lg`, `inset-sm|md` (pressed or recessed). Shadow colors come from the
theme color tokens, so one definition serves light and dark. Forced-colors mode removes shadows:
components keep `border: 1px solid transparent`.
