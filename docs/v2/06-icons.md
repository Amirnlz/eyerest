# 06 Icons

Item 5. Today: five glyphs (`eye`, `sun`, `moon`, `skip`, `postpone`) on a 24 grid, outline with
optional fill, painted with `currentColor`, registry in `src/renderer/ui/icons.ts`. V2 keeps the
architecture (data registry, no icon dependency, `mirrorInRtl` flag) and redraws and extends the set.

## Style

| Property | Spec |
| -------- | ---- |
| Grid | 24 by 24, 2 px live-area padding (glyph body 20 by 20) |
| Stroke | 1.75 at 24, round caps, round joins. Not scaled with the box: see optical sizes |
| Corners | Inner radius 1.5 where two strokes meet at a corner, never sharp, never fully round blobs |
| Fill | Outline by default. Filled variant only for the selected state of a toggle-like icon (sun and moon in the theme control) |
| Color | `currentColor` only. No two-tone, no gradient, no accent inside the glyph (G4, G5) |
| Metaphor | Literal and quiet. An eye is an eye. No sparkles, no stars, no abstract blobs |
| Detail | At most four shapes per glyph. If it needs more, simplify the metaphor |

## Optical sizes

A fixed stroke scales visually heavier when the box grows. V2 adjusts stroke by size so the visual
weight stays constant:

| Size token | Box | Stroke | Use |
| ---------- | --- | ------ | --- |
| `sm` | 16 | 1.5 | Inline with `caption`, button icon in `sm` buttons |
| `md` | 20 | 1.75 | Sidebar items, rows, `md` buttons |
| `lg` | 24 | 1.75 | Toast, exercise header |
| `xl` | 40 | 1.5 | Full-screen cue eye |

Stroke uses `vector-effect: non-scaling-stroke` (as today) with the size-table value applied in CSS
through a variable, so one path serves all sizes. Sizes below 16 are not used.

## Alignment

Icons are optically centered next to text: the existing button padding rule (S5) is kept. Icon and
label gap 8 px. An icon-only control has a 44 px target with the 20 px glyph centered, and an
`aria-label`.

## Set

Names are final unless review changes them. Existing glyphs are redrawn, not renamed.

| Name | Use | Status | Mirror in RTL |
| ---- | --- | ------ | ------------- |
| `eye` | Brand mark, rest, exercise cue | Redraw | No |
| `sun` | Theme Light | Redraw | No |
| `moon` | Theme Dark | Redraw | No |
| `monitor` | Theme System | New | No |
| `skip` | Skip | Redraw | Yes |
| `postpone` | Postpone (clock) | Redraw | No |
| `sliders` | Settings pane: Rhythm | New | No |
| `leaf` | Settings pane: Rest | New | No |
| `calendar` | Settings pane: Schedule | New | No |
| `palette` | Settings pane: Appearance | New | No |
| `chart` | Settings pane: Activity | New | No |
| `check` | Saved status, selected row | New | No |
| `close` | Close button | New | No |
| `chevron` | Disclosure, stepper arrows (rotated by CSS) | New | Yes |
| `minus`, `plus` | Stepper | New | No |
| `alert` | Field error marker | New | No |

Exercise cues (`look-far`, `roll`, `blink`) are animated CSS compositions built on the `eye`
glyph, not separate icons (`08-motion.md`).

`leaf` for Rest is deliberately plain. If review finds it generic or wellness-cliche, replace
with `eye-off`. Open check C4.

## Brand mark

The app icon and tray icons stay generated from the `eye` glyph by `src/design/brand-icons.ts`
(pure generator, committed PNGs equal to generator output by test). V2 changes:

| Asset | Change |
| ----- | ------ |
| App icon | Onyx 2 rounded square on the macOS grid, `alabaster` glyph, one `mist-blue` pupil. One accent, no gradient |
| Tray icon | Unchanged recipe: macOS black template image; Windows and Linux dark and light glyph variants |
| DMG background | Onyx 2, same arrow, no text |
| NSIS artwork | Still deferred (4.14) |

Brand asset regeneration is a separate step, after the in-app UI (R4). Tests: committed files equal
generator output; builder config references every file (exists today).

## Accessibility

Decorative icons (next to a visible label) are `aria-hidden`. Icon-only controls carry
`aria-label` from `copy.ts`. Status icons (`check`, `alert`) are paired with text, never alone.

## Tests

| Layer | Test |
| ----- | ---- |
| Logic | Registry loops (every name has shapes and a `mirrorInRtl` flag; no empty path; every path parses; shapes within the 2 px live area). Every `fillable` shape is a closed shape |
| jsdom | `Icon` renders the right shapes, `aria-hidden` by default, label when given, stroke var per size, RTL flip only when flagged |
| Gallery | Icon sheet in both themes and forced-colors; computed `stroke` is `currentColor`; no overflow in 16 px box |
| Logic | Brand generator pixel equality for V2 colors |
