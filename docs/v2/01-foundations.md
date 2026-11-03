# 01 Foundations

Source of truth stays `src/design/*` once coded. This file is the design spec those files must
match. Figma board `7:2` shows the same tables.

## Palette

Coolors palette, with one change (Mist Blue added as the accent; no palette color was removed).

| Step | Hex | Origin |
| ---- | --- | ------ |
| `onyx` | `#0A0A0A` | Coolors |
| `onyx-2` | `#141414` | Coolors |
| `graphite` | `#292929` | Coolors |
| `charcoal-blue` | `#1F3B47` | Coolors |
| `alabaster` | `#E5E4E2` | Coolors (alabaster grey) |
| `mist-blue` | `#86AEBE` | Added. Lightened Charcoal Blue hue, for use on dark surfaces |

Why a change: Charcoal Blue on Onyx 2 is 1.56:1, so it cannot carry progress or focus on dark.
Mist Blue on Onyx 2 is 7.73:1. Charcoal Blue is kept for the track, the glow, and as the accent
on light surfaces (9.31:1 on Alabaster).

Alpha primitives: `alabaster` at 8, 12, 40, 64 percent. `onyx` at 8, 12, 40, 56, 64 percent.
`mist-blue` at 40 percent.

## Semantic color tokens

`--er-color-<name>`. Dark and light share names. Components use these only.

| Token | Dark | Light | Role |
| ----- | ---- | ----- | ---- |
| `surface-base` | onyx | alabaster | Window and page background |
| `surface-panel` | onyx-2 | alabaster | Cards, rest panel, settings groups |
| `surface-raised` | graphite | onyx 8% | Secondary button, selected segment, input fill |
| `text-primary` | alabaster | onyx | Main text |
| `text-secondary` | alabaster 64% | onyx 64% | Helper text, units |
| `text-disabled` | alabaster 40% | onyx 40% | Disabled (exempt from contrast, still legible) |
| `border-subtle` | alabaster 12% | onyx 12% | Hairline edge on panels and inputs |
| `overlay-hover` | alabaster 8% | onyx 8% | Hover fill |
| `overlay-pressed` | alabaster 12% | onyx 12% | Pressed fill |
| `accent-progress` | mist-blue | charcoal-blue | Ring progress, chart "taken", selected state |
| `accent-track` | charcoal-blue | onyx 12% | Ring track, chart baseline |
| `accent-glow` | charcoal-blue | mist-blue 40% | Rest glow (see Glow) |
| `focus-ring` | mist-blue | charcoal-blue | Keyboard focus, 2 px |
| `scrim-dim` | onyx 56% | onyx 56% | Dim layer. Same in both themes |

Light `surface-base` and `surface-panel` are the same tone. Edge and depth come from
`border-subtle` plus the card shadow, not from a tone step.

### Contrast (measured in Figma file, to be re-asserted by test)

| Pair | Dark | Light | Minimum |
| ---- | ---- | ----- | ------- |
| `text-primary` on `surface-panel` | 14.5 | 15.58 | 4.5 |
| `text-secondary` on `surface-panel` | 6.48 | 5.56 | 4.5 |
| `text-primary` on `surface-raised` | 11.45 | 13.18 | 4.5 |
| `text-secondary` on `surface-raised` | 5.61 | 5.18 | 4.5 |
| `accent-progress` on `surface-panel` | 7.73 | 9.31 | 3 |
| `focus-ring` on `surface-panel` | 7.73 | 9.31 | 3 |

Known and accepted: `accent-track` on `surface-panel` is 1.56 in dark. The track is decorative;
the number beside it carries the information (G15 covers informational shapes only).
Rule: no information is carried by the track alone.

`border-subtle` is a hairline, not a control boundary. Inputs need a 3:1 boundary
(`07-inputs-forms.md`): they use `surface-raised` fill plus `border-subtle`, and the fill against
the panel is checked to 3:1 in the test list in `10-plan.md`. If the fill pair fails 3:1, inputs
move to `text-secondary` at 40 percent for the edge. Verify before coding (open check C1).

## Typography

Open question Q2 decides the family. Spec below is family independent.

| Role | Size | Line | Weight | Tracking | Use |
| ---- | ---- | ---- | ------ | -------- | --- |
| `display` | 3rem | 1.05 | 600 | -0.03em | Countdown |
| `title-lg` | 1.75rem | 1.2 | 600 | -0.02em | Full-screen card title, settings pane title |
| `title` | 1.25rem | 1.3 | 600 | -0.01em | Card title, group heading |
| `body` | 0.9375rem | 1.5 | 400 | 0 | Messages, row labels |
| `label` | 0.875rem | 1.25 | 500 | 0 | Buttons, row labels in controls |
| `caption` | 0.75rem | 1.4 | 400 | 0.01em | Hints, units, chart axis |
| `eyebrow` | 0.6875rem | 1.2 | 600 | +0.08em uppercase | "Eye rest", "Long rest" above the title |

Tracking is size specific: negative at large sizes, positive at small. Numerals are tabular
wherever a number changes or aligns (countdown, stepper, chart values). The family is
`system-ui` stack when Q2 is accepted: SF Pro on macOS, Segoe UI Variable on Windows, the
distribution's UI font on Linux. Figma uses Inter as a stand-in because SF Pro is not available in
the file.

## Space, radius, stroke

| Group | Values |
| ----- | ------ |
| Space | 4, 8, 12, 16, 20, 24, 32 (4 px grid). Existing `--er-space-*` steps map one to one |
| Radius | `sm` 8, `md` 12, `lg` 20, `xl` 24, `full` 999. Concentric rule: inner = outer - padding |
| Stroke | `hairline` 1, `focus` 2, `focus-offset` 2 |

Radius use: rest card `xl`, warning toast `lg`, settings group `lg`, input `md`, chip `sm`,
button and switch `full`.

## Elevation

Neumorphic levels are removed. Three levels:

| Level | Recipe | Use |
| ----- | ------ | --- |
| `none` | hairline only | Settings groups, inputs |
| `card` | hairline + `0 8 24 onyx 24%` (dark), `0 8 24 onyx 12%` (light) | Rest card, warning toast |
| `window` | none. The OS draws window shadows | Settings window |

One shadow per level, no stacking (G8). On dark the hairline does the work; the shadow is almost
invisible against a dark desktop and that is intended.

## Materials

| Surface | Material |
| ------- | -------- |
| Rest card, toast | Opaque `surface-panel` |
| Dim layer | Flat `scrim-dim` |
| Full-screen rest | Opaque card on a flat scrim at 80% (`03-rest-modes.md`) |
| Settings window | Opaque `surface-base` |

Why no blur: `backdrop-filter` in a transparent Electron window blurs only the window's own
content, not the desktop. Real vibrancy exists only as `vibrancy` on macOS and
`backgroundMaterial` on Windows 11, not on Linux. Using it would make the app look different per
platform and fail on Wayland. Listed as roadmap candidate R2.

## Glow

The only gradient (G1): one radial gradient behind the rest card header, `accent-glow`, 300 by
300, centered near the ring, fading to transparent. It marks "rest in progress" without a banner.
It is a token-driven CSS radial gradient, not an image. Reduced transparency or forced colors:
removed. Open check C2: if it reads as decoration on hardware, delete it; nothing depends on it.

## Countdown ring

Track `accent-track`, progress `accent-progress`, round caps. Large 88 px stroke 6 (rest card),
small 40 px stroke 4 (toast), full-screen 120 px stroke 8. The view model has no total duration
today (`design-system.md` 2.3a), so the ring needs `totalSeconds` in the snapshot or the renderer
learns it from the first tick, which is the weakness recorded as I33. Code step 2 in `10-plan.md`
adds `totalSeconds` to the shared contract.
