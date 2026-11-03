# 00 Principles

## Direction

| Topic | V1 | V2 |
| ----- | -- | -- |
| Style | Soft neumorphism | Flat, soft, quiet. Depth from one hairline and one soft shadow |
| Color | Achromatic only (rule F1) | Neutral ramp plus one accent, Mist Blue. Rule F1 is superseded |
| Themes | Light default | Light and dark, both first class. System by default |
| Primary action | Filled `accent` button | None. Resting is the primary action; Skip and Postpone are secondary and quiet |
| Motion | Ease-out, no bounce | Critically damped springs, interruptible, symmetric enter and exit |
| Type | Manrope bundled | System font (open question Q2) |
| Icons | 5 glyphs, 24 grid | Full set, optical sizes, one stroke language (`06-icons.md`) |

Product tone is unchanged: calm, non-intrusive. The app interrupts someone who is working. Every
V2 choice is judged against that: if it draws attention to the app instead of the rest, remove it.

## Apple principles applied

| Principle | Consequence in eyerest |
| --------- | ---------------------- |
| Purpose | One job per surface. The rest card shows time left and one instruction. Nothing else |
| Agency | Skip and Postpone are always reachable during a rest, by pointer and by keyboard |
| Responsibility | No dark patterns. Skip is not shamed. No streaks, scores or guilt copy |
| Familiarity | System font, grouped settings rows, switches and segmented controls that behave like the OS |
| Flexibility | Reduced motion, reduced transparency, increased contrast, forced colors, text scaling all handled |
| Simplicity | One accent, five type roles, seven spacing steps |
| Craft | 4 px grid, concentric radii, size-specific tracking, optical icon alignment |
| Delight | Small and earned: the settle of a spring, the exercise loop. Never confetti |

## Anti "AI slop" guardrails

These are rules, each checkable in review. Violations go in the register in `design-system.md`
section 14.

| ID | Rule |
| -- | ---- |
| G1 | No gradient except the single rest glow (`01-foundations.md`, Glow). No gradient on text, buttons, borders or backgrounds of settings or stats |
| G2 | No glassmorphism. A window cannot blur the desktop behind it on every platform, so a frosted look would be fake. Panels are opaque |
| G3 | No purple, violet, magenta or neon. The only hue family is Charcoal Blue to Mist Blue |
| G4 | No emoji and no illustration in the UI. Icons come from the set in `06-icons.md` |
| G5 | No icon inside a tinted circle as decoration. An icon sits next to its label, uncolored, at its optical size |
| G6 | No uniform grid of identical cards. Settings are grouped rows. Stats are one chart and one number |
| G7 | No decorative radius. Radii follow the scale and the concentric rule (inner radius equals outer minus padding) |
| G8 | One shadow recipe per elevation. No stacked drop shadows, no colored shadows |
| G9 | One accent per screen region, used only for progress, focus and the selected state. Never for decoration |
| G10 | No gamification: no streaks, badges, percentages of "goal", celebration animations, or comparison to other people |
| G11 | No centered-everything layouts. Settings and stats align left to a shared baseline grid. Only the rest content may center, and only in full-screen mode |
| G12 | No animated number rolls, count-ups or bouncing. Digits change in place (tabular numerals) |
| G13 | Copy is plain and short. No exclamation marks, no second-person pep ("You've got this"), no filler |
| G14 | Every value comes from a token. A raw hex, px or ms in component CSS fails lint (existing rule) |
| G15 | Contrast is a hard gate: 4.5 text, 3 non-text, in both themes, validated by test, not by eye |

## Review checklist (apply to every V2 step)

1. Squint test: is the countdown the loudest element on the rest card.
2. Remove test: delete each element; if nothing is lost, it stays deleted.
3. Both themes screenshot-free check: gallery computed-style tests pass in light, dark, and forced-colors.
4. Reduced motion: every animation has a stated fallback.
5. G1 to G15 each ticked or justified.
6. Platform behavior stated for Windows, macOS, Linux X11, Linux Wayland.

## Conflicts with existing rules

| Existing rule | V2 position |
| ------------- | ----------- |
| F1 achromatic only | Superseded. Mist Blue and Charcoal Blue are allowed, tested as a closed palette |
| F3 shadows carry depth only | Kept. Hairlines and fills carry edges; shadow is never the only boundary |
| Direction: soft neumorphism | Dropped by owner decision |
| Light is the default theme | Replaced by system default (`02-theming.md`) |
| Spec: "All UI is an overlay at the top-right" | Component mode keeps it. Full-screen mode is an opt-in addition (Q1) |
