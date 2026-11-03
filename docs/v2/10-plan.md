# 10 Plan: code phase, tests, platforms, roadmap candidates

No step starts before the owner answers `09-decisions.md` and approves this plan. One small,
complete, tested step per response. Each step leaves `npm run check` green; `npm run e2e` is
required when main, preload or overlay code changes. Each step ships logic tests and UI/UX tests
(project rule). Branch names use the `v2/` prefix, one branch per step.

## Pattern

Tokens are data in `src/design/*` (pure TypeScript), generators emit CSS, components read
variables only. This is the V1 architecture, unchanged: V2 edits token values and component CSS,
not the pipeline. New cross-process data (rest display, `totalSeconds`) enters through
`src/shared` first, then main, then preload, then renderer. The renderer renders snapshots and
owns no timing.

## Steps

| Step | Branch | Scope | Layer touched | e2e gate |
| ---- | ------ | ----- | ------------- | -------- |
| V2.0 | `v2/design-docs` | These documents, ROADMAP update | docs | No |
| V2.1 | `v2/tokens` | Palette, themed color tokens, type, radius, elevation, contrast pairs, both themes. Remove neumorphic elevation. Forced-colors and contrast variants | `src/design` | No |
| V2.2 | `v2/motion-tokens` | Spring solver, `linear()` generation, duration tokens, reduced-motion values | `src/design` | No |
| V2.3 | `v2/icons` | Redrawn and new glyphs, optical sizes, registry tests, icon sheet in gallery | renderer | No |
| V2.4 | `v2/primitives` | Button, Surface, Text, Countdown, ProgressRing restyled to V2 tokens. Gallery light and dark | renderer | No |
| V2.5 | `v2/rest-card` | Component mode: card and toast on V2 primitives, `totalSeconds` in the snapshot (shared contract), ring from real total, enter animation | shared, main, renderer | Yes |
| V2.6 | `v2/exit-motion` | Delayed hide, exit animation (Q3) | main, renderer | Yes |
| V2.7 | `v2/controls` | Stepper, switch, segmented, weekday chips, time field, validation | renderer | No |
| V2.8 | `v2/settings-shell` | Sidebar, panes, window size, Appearance pane with theme control (Q6) | main (window size), renderer | Yes |
| V2.9 | `v2/settings-panes` | Rhythm and Schedule panes on the new controls, dirty state, close prompt | renderer | Yes |
| V2.10 | `v2/stats` | Chart, summary, table toggle | renderer | Yes (stats e2e) |
| V2.11 | `v2/rest-fullscreen` | `restPresentation` preference, contract, window bounds, full-screen layout, Rest pane control | shared, main, renderer | Yes |
| V2.12 | `v2/brand-assets` | App icon, tray, DMG regenerated for V2 colors | `src/design`, build | No |
| V2.13 | `v2/polish` | Hardware pass, violations register empty, docs consolidated into `design-system.md` | all | Yes |

Order rationale: tokens and motion first (pure, no UI risk), controls before the screens that use
them, the main-process changes (V2.5, V2.6, V2.11) isolated in their own steps so each can be
verified on hardware. V2.11 is last among features because it depends on Q1 and carries the
spec change.

## Definition of done per step

1. Implementation.
2. Logic tests (token, model, contract, window manager as applicable).
3. UI/UX tests: jsdom component tests (render per state, behavior, copy, roles and labels,
   keyboard) and gallery computed-style checks in light, dark, forced-colors; Playwright e2e where
   the step touches main, preload or overlay.
4. `npm run check` green. `npm run e2e` green when gated.
5. Platform behavior stated for Windows, macOS, Linux X11, Linux Wayland. What was not verified on
   hardware is listed in `docs/ISSUES.md` as `NEEDS INFO`.
6. G1 to G15 ticked in the step report.
7. `docs/ROADMAP.md` row updated.

## Platform matrix (all steps)

| Concern | Windows | macOS | Linux X11 | Linux Wayland |
| ------- | ------- | ----- | --------- | ------------- |
| Overlay layout | `positioned` | `positioned` | `positioned` | `surface` |
| Full-screen mode | Centered card, scrim over full bounds | Centered card, scrim above menu bar and Dock | Centered card, scrim over full bounds | Centered card, work area only, panels visible |
| Transparent window | Works | Works | Black without a compositor (V4, C7) | Works |
| Theme source | Personalization setting | Appearance | Portal or GTK | Portal or GTK |
| Forced colors | High contrast | Increased contrast query | Not generally available | Not generally available |
| System font | Segoe UI Variable | SF Pro | Distro UI font | Distro UI font |
| Global shortcuts (4.12) | Works | Works | Works | Off until verified |

## Roadmap candidates raised by V2

These are not V2 scope. Recorded so they are not lost.

| Id | Candidate |
| -- | --------- |
| R1 | Separate rest display setting for long rests |
| R2 | Native material (`vibrancy` on macOS, `backgroundMaterial` on Windows 11) with opaque fallback |
| R3 | Full-screen card on the display holding the cursor |
| R4 | Visible shortcut hints on the rest card (Q10) |
| R5 | Move sound, do not disturb, autostart, idle into settings panes |
| R6 | Settings window position and size memory |
| R7 | Stats range beyond 7 days, clear stats (existing 4.9 candidates) |
| R8 | Localization and RTL (existing 4.10): V2 layouts use logical properties so this is additive |

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Full-screen mode blocks work the user wants to keep reading | Preference, Skip and Postpone always available, never during the warning |
| A hidden always-on-top window failing to hide after the exit delay | Delay is cancelable and bounded; main hides on any new phase; test with fake clock |
| System font metrics shift layouts per OS | 8 percent width slack, gallery overflow checks, no fixed-width text containers |
| Contrast loss from translucent alpha tokens over unknown desktops | Overlay surfaces are opaque; alpha tokens only on opaque panels |
| Doc and Figma drift | Tokens listed once in `01-foundations.md`; Figma variables use the same names |
