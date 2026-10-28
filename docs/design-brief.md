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
