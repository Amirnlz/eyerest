# 03 Eye exercise and rest: component mode and full-screen mode

Item 2. The same rest, presented two ways. The scheduler, the snapshot and the exercise logic
(`src/renderer/exercise/exercises.ts`) do not change. Only presentation and one preference do.

Spec change, approved by the owner (Q1): in full-screen mode the rest card moves from the top-right
to the center of the screen, larger, and the user is held to the rest. It applies to the rest phase
only, short and long rests alike. The warning stays a top-right toast. Component mode is the
original top-right behavior. A single preference chooses between them.

## Modes

| | Component mode (default) | Full-screen mode (opt-in) |
| - | ------------------------ | ------------------------- |
| Footprint | Card at top-right, 360 wide | The same card, centered on the primary display, 480 wide, scrim on every display |
| Dim | Existing dim layer, `scrim-dim` 56% | Same dim layer, higher opacity (80%), blocks clicks on every display |
| Warning phase | Toast, top-right, click-through | Same toast. Never full-screen: a heads-up must not interrupt |
| Rest phase | Card with ring, title, prompt, Skip, Postpone | Large ring, eyebrow, prompt, Skip, Postpone |
| Exercise cue | 40 px glyph in the header | 96 px cue in the header |
| Long rest | Same card, longer countdown | Same layout, `10:00` countdown |
| Intended for | People who want to keep working in view | People who want to be held to a real break |

## Component mode

Figma: RestCard set `8:86`, screens `16:47` (eye rest) and `16:84` (long rest).

```text
 ┌──────────────────────────────────┐   360 wide, padding 24, radius xl
 │ (ring 88)  EYE REST              │   eyebrow
 │  0:14      Look at something     │   title (current exercise name)
 │            far away.             │   body (prompt)
 │                                  │
 │                 Skip   Postpone  │   quiet + secondary, right aligned
 └──────────────────────────────────┘
```

| Element | Spec |
| ------- | ---- |
| Ring | 88 px, stroke 6, countdown inside, `display` role scaled to fit |
| Eyebrow | `eyebrow` role, `text-secondary` |
| Title | `title` role. During an exercise: the exercise name. Otherwise the existing copy |
| Body | `body`, `text-secondary` |
| Actions | Skip `quiet`, Postpone `secondary`, pill 36 high. No primary button |
| Height | Fixed per kind so the window does not resize mid-rest (`OVERLAY_SIZE` 360 by 240 holds the tallest) |
| Shortcut hints | Still a tooltip and a described-by (design-system 2.3a). A visible hint stays an open design question (Q10) |

## Full-screen mode

New design, not in Figma yet. It is the same card as component mode, scaled up and centered.
Not a bare-text screen: the opaque card keeps contrast independent of what is on the desktop.

```text
 scrim over every display, blocks clicks
                 ┌──────────────────────────────────────┐   480 wide, padding 32, radius xl
                 │ (ring 120)   EYE REST                │   eyebrow
                 │  0:14        Look at something       │   title-lg
                 │              far away.               │   body
                 │                                      │
                 │                  Skip     Postpone   │   quiet + secondary, md size
                 └──────────────────────────────────────┘
                                centered on the primary display
```

| Element | Spec |
| ------- | ---- |
| Card | `surface-panel`, hairline, `card` elevation, radius `xl`, 480 wide, padding 32, centered horizontally and vertically in the primary display |
| Ring | 120 px, stroke 8, countdown inside in `display` role |
| Header | Ring left, text column right, as in component mode. Same copy, same exercise prompt |
| Exercise cue | 96 px, replaces the ring's neighbor glyph |
| Actions | Skip and Postpone, `md` size (44 px targets), right aligned |
| Scrim | Same dim layer as today at 80% opacity on every display, blocks clicks |
| Glow | Same glow, scaled with the card |
| Enter and exit | Card scales 0.96 to 1 from its center with opacity; scrim fades. Details in `08-motion.md` |

The card is larger but the content is the same. Nothing is added to fill the space (G6, G11).

"Force the user to rest" means: the scrim blocks input to the apps below, and Escape does not end
the rest. It does not remove Skip and Postpone. The product spec requires both during a rest, and
the owner's rule is that a rest ends by a deliberate action, not by chance. If hard enforcement
(no Skip) is wanted later, that is a spec change, not a presentation change.

## Window architecture

Existing: one overlay window (primary display) plus one click-through or click-blocking dim window
per display. V2 reuses both; no new window type.

| Layout | Component mode | Full-screen mode |
| ------ | -------------- | ---------------- |
| `positioned` (Windows, macOS, X11) | 360 by 240 window at top-right | Overlay window centered on the primary display at 480 by the card height (no longer display-sized). Dim windows unchanged, higher opacity, click-blocking |
| `surface` (Wayland) | Work-area window, CSS places the card | Same work-area window, CSS centers the card. Panels and the taskbar stay visible and the dim layer may not cover them: Wayland gives apps no protocol for covering them. Documented limit |

Rules:

1. The overlay never takes keyboard focus (rule A6). Full-screen mode does not change that.
   Skip and Postpone stay reachable by pointer and by the global shortcuts (roadmap 4.12).
2. Escape does nothing. A rest ends only by Skip, Postpone or the countdown, so a stray key press
   cannot end it and the spec stays intact.
3. Full-screen mode: dim windows block clicks on every display (`setInteractive(true)`). Component
   mode keeps the current dim behavior (check C5 confirms what it is today). The overlay window is
   interactive during the rest and click-through during the warning, as today.
4. Display hot-plug mid-rest: the card stays on the display it started on; new displays get a
   scrim only. Moving content mid-rest is a candidate, not V2 scope.
5. Multi-monitor: card on the primary display (the display the current overlay uses). Following
   the cursor display is candidate R3.
6. Full-screen apps (video players, games): `alwaysOnTop` level tuning is unchanged. A
   full-screen exclusive game on Windows may hide the window; known and out of V2 scope.

## Preference and contract

| Item | Decision |
| ---- | -------- |
| Name | `restPresentation`: `'card' \| 'fullscreen'` |
| Stored in | `preferences.json` (UI preference, like theme and sound), not `settings.json` (scheduler durations) |
| Shared contract | `src/shared` gains the type and a validated IPC channel. Main validates the payload. Renderer receives it with the snapshot and renders accordingly; it owns no timing |
| Default | `card` (assumption, see `09-decisions.md` Q1). One setting for eye rests and long rests |
| Entry points | Settings window, Rest pane. Tray: no entry (the tray is for toggles used daily) |

## Exercise behavior in both modes

Unchanged: the rest is split into equal parts, one per exercise (look far, roll, blink), by elapsed
time. Exercises are on or off from the tray (roadmap 4.6). Off: the static message shows and no
cue is drawn. A long rest (10 min) shows the exercises in sequence only during the first 20 s,
then a calm static prompt ("Stand up, stretch and rest away from the screen."), because three
exercises stretched over ten minutes would loop meaninglessly. That is a behavior decision, flagged
as Q11.

## Accessibility

| Item | Spec |
| ---- | ---- |
| Live region | One polite announcement at phase start and at milestones, never per second (A2) |
| Timer | `role="timer"` on the countdown, not announced per tick |
| Cue | `aria-hidden`. The prompt text carries the instruction |
| Keyboard | Tab reaches Skip then Postpone. Visible focus ring `focus-ring` 2 px |
| Reduced motion | Cue becomes a still frame. Entrance is a 150 ms fade |
| Increased contrast | Scrim opacity rises. Text color unchanged |

## Platform behavior

| Platform | Component mode | Full-screen mode |
| -------- | -------------- | ---------------- |
| Windows | Top-right window, transparent | Centered window, scrim over full display bounds including the taskbar, level as today |
| macOS | Same | Centered window, scrim above the menu bar and Dock via the existing window level |
| Linux X11 | Same. No compositor: transparent areas may render black (known, V4) | Same risk for the card's rounded corners |
| Linux Wayland | Surface window, CSS placement | Surface window, CSS centering, panels remain visible |

## Tests

| Layer | Test |
| ----- | ---- |
| Logic | View model: `restPresentation` passes through for rest, never for warning. Long rest exercise rule. `totalSeconds` ring math |
| Logic | Shared contract: channel validates payload, rejects other values. Preferences store round trip |
| Logic | Window manager (fake ports): bounds for `fullscreen` are the centered 480 rect on the primary display, restored to top-right on rest end; hot-plug keeps the card's display |
| jsdom | Card and full-screen render per rest kind; Skip and Postpone fire once; keyboard order; labels; no buttons in warning |
| Gallery | Both modes, both themes: no overflow at 360 by 240 (card) and 480 by its height (centered), contrast |
| e2e | Full-screen preference centers the overlay window on the primary display and the dim blocks clicks; Skip ends it; Postpone shifts next rest. Placement per `EYEREST_PLACEMENT` |
