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

## Motion

Source: `src/design/motion.ts`. CSS: `buildMotionCss()`. Values from the `better-ui` skill.

- Durations: `fast` 100ms (hover), `quick` 150ms (press, exit), `base` 300ms (enter, icon swap).
- Easings: `out` = `ease-out`, `standard` = `cubic-bezier(0.2, 0, 0, 1)`. No bounce or overshoot.
- Effects: press scale 0.96; enter 0.75rem up with 0.25rem blur, staggered 100ms; exit -0.75rem fixed.
- State changes use CSS transitions, never keyframes. Name the animated properties, never `all`.
- Reduced motion: the effect tokens go neutral (scale 1, offsets 0, blur 0) under
  `prefers-reduced-motion: reduce`. Durations stay, so the opacity fade still plays.
- Theme-switch transition suppression (disable transitions for one frame during a theme flip) is a
  runtime helper. It ships with theme switching in Phase 3, not as a token.

## Wiring

- `virtual:eyerest-design.css` (`src/design/vite-plugin.ts`) serves `buildDesignCss()` to the renderer
  (`electron.vite.config.ts`) and the dev harness (`harness/vite.config.ts`). Token edits need a
  dev-server restart.
- Theming rule: any custom property whose value uses `var(--er-color-*)` is declared through
  `themedBlocks()` (`src/design/theme-scope.ts`), never on a bare `:root`. A `var()` resolves where it
  is declared, so a bare `:root` declaration keeps light colors inside `[data-theme='dark']`.
- No global background is set: the overlay window is transparent on Wayland (`surface` layout).
