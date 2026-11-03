# 09 Decisions and open questions

Format per decision: recommendation, main alternative, why the alternative loses, trade-off.
"Decided" means settled by the owner in this V2 thread. "Proposed" needs approval.

## Decisions

| ID | Decision | Status |
| -- | -------- | ------ |
| D0 | Palette: Coolors set plus Mist Blue; neumorphism dropped; soft, flat, minimal | Decided |
| D0a | Light and dark both supported | Decided |
| D0b | Scope: items 1 to 7 in `README.md`; documentation before code | Decided |

### D1 Accent color: Mist Blue on dark, Charcoal Blue on light (proposed)

- Alternative: keep the five Coolors colors unchanged. Loses: Charcoal Blue on Onyx 2 is 1.56:1,
  so progress and focus fail 3:1 on dark.
- Alternative: a brighter saturated blue. Loses: G3, and it pulls attention to the app.
- Trade-off: one added color (a derived tint of an existing one), and rule F1 is superseded.

### D2 No primary button (proposed)

- Alternative: filled accent "Skip" or "Done". Loses: resting is the goal; a bright action makes
  skipping the visual default and conflicts with G9 and the Responsibility principle.
- Trade-off: the rest card has less hierarchy among its two buttons. Postpone is `secondary`, Skip
  `quiet`; both stay reachable.

### D3 Opaque panels, no blur (proposed)

- Alternative: translucent material with `backdrop-filter`. Loses: it cannot blur the desktop
  behind a window, so it would be a fake frost (G2); native vibrancy exists on macOS and Windows 11
  only.
- Trade-off: less "Apple" sheen; more consistency and zero cost on software-rendered Linux.

### D4 Springs from `linear()`, critically damped (proposed)

- Alternative: a JS animation library (Motion, React Spring). Loses: new dependency, runs on the
  main thread of a window whose job is to stay out of the way, no gain for a handful of
  transitions.
- Alternative: keep ease-out curves. Loses: not interruptible in feel, no shared vocabulary.
- Trade-off: a generated easing string; a small solver to test.

### D5 Settings: sidebar and panes (proposed)

- Alternative: one scrolling page with headings (today). Loses: already mixes a report with
  forms and cannot take the phase 4 settings without growing.
- Alternative: top tabs. Loses: tabs read as a toolbar, hold three or four items before wrapping,
  and do not carry icons and labels well at 640 px.
- Trade-off: more chrome and one more keyboard pattern (roving focus).

### D6 Stats: chart with accessible table (proposed)

- Alternative: keep the table. Loses: seven rows of three numbers hide the shape of the week.
- Alternative: line chart or progress rings. Loses: lines imply a continuous trend over seven
  points; rings imply a goal (G10).
- Trade-off: custom SVG bars to maintain; no chart dependency (alternative `d3` or Recharts:
  large for seven rects).

### D7 Stepper over slider (proposed)

- Alternative: sliders for durations. Loses: imprecise for exact minutes, harder to use by keyboard
  on a 10 to 40 range, and sliders invite fiddling.
- Trade-off: stepper plus text input is wider than a bare field.

### D8 Rest display preference stored in `preferences.json` (proposed)

- Alternative: `settings.json`. Loses: that file feeds `createConfig` and restarts the scheduler;
  presentation must not restart the work timer.

### D9 Exit animation by delaying `hide()` (proposed)

See `08-motion.md`. Alternative: renderer acknowledgement. Loses: a missed acknowledgement keeps an
always-on-top window up.

### D10 Native time input (proposed)

- Alternative: custom time wheel. Loses: accessibility, localization and test cost for no
  functional gain.

### D11 No red for errors (proposed)

- Alternative: a warm red token. Loses: breaks the closed palette (D1 already spent the allowed
  change), and color-only meaning fails in forced-colors anyway.
- Trade-off: errors are visually quieter; the icon, message, `aria-invalid` and a 2 px edge carry them.

## Open questions

Each needs a one-line answer. Defaults apply if the owner says "go with recommendations".

| ID | Question | Recommendation |
| -- | -------- | -------------- |
| Q1 | Full-screen rest is a spec addition (spec says top-right overlay). Approve it as an opt-in preference, default Card? One setting for both eye and long rests, or separate? | Approve opt-in, default Card, one setting |
| Q2 | Typeface: system font (SF Pro, Segoe UI Variable, distro UI font) and delete the bundled Manrope, or keep Manrope on every platform? | System font. Closer to native, no bundled file, no `FontFace` loader. Cost: slightly different metrics per OS, so layouts get 8 percent slack for width |
| Q3 | Exit animation needs `OverlayWindowManager` to hide 230 ms late (main change, `e2e` gate). Approve? | Approve |
| Q4 | Settings Save: `secondary` like other buttons, or one filled accent button? | `secondary` |
| Q5 | Settings structure: sidebar panes (D5) or keep one page? | Sidebar |
| Q6 | Add Theme choice to the settings window (closes I30), keeping the tray entry? | Yes |
| Q7 | Confirm supersession of rule F1 (achromatic only) by D1? | Confirm |
| Q8 | When the OS reports no color-scheme preference, default to light (no change for current users) or dark (V2 is dark-first)? | Light |
| Q9 | Keep the Charcoal Blue rest glow (the one gradient) or drop it now? | Keep, review on hardware (C2), delete if it reads as decoration |
| Q10 | Show shortcut hints visibly in the rest card (today tooltip and screen reader only)? Needs card height or a smaller hint line | Not in V2; candidate |
| Q11 | During the 10 min long rest, run exercises only in the first 20 s, then a static prompt? | Yes |
| Q12 | Settings window: 720 by 520 resizable, min 640 by 420, instead of 480 by 760? | Yes |

## Open checks (verify before or during the coded step)

| ID | Check | When |
| -- | ----- | ---- |
| C1 | Input fill and edge reach 3:1 against `surface-panel` in both themes; otherwise raise the edge to `text-secondary` 40% | Before the form step, computed by the contrast test |
| C2 | Glow reads as a quiet state marker on real hardware | Phase 3.3 style hardware pass |
| C3 | Full-screen text on scrim meets 4.5 over white and black desktops | Full-screen step, contrast test with synthetic backdrops |
| C4 | `leaf` icon for the Rest pane is not cliche; fallback `eye-off` | Icon step review |
| C5 | Dim windows block clicks in the current code (`setInteractive`); confirm and keep identical for full-screen | Before the full-screen step |
| C6 | Figma Screens page `5:25` visually verified; full-screen, settings, stats, icons, forms and light screens drawn | When the Figma MCP limit resets, before the step that uses each |
| C7 | Transparent window on X11 without a compositor renders opaque black (V4). Verify on hardware | Existing Phase 3.3 item |
