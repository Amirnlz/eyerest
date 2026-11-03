# 03 Eye exercise and rest: component mode and full-screen mode

Item 2. The same rest, presented two ways. The scheduler, the snapshot and the exercise logic
(`src/renderer/exercise/exercises.ts`) do not change. Only presentation and one preference do.

Spec conflict, stated first: the product spec says all UI is a top-right overlay. Component mode
is exactly that. Full-screen mode is an opt-in addition, off by default. Needs approval (Q1).

## Modes

| | Component mode (default) | Full-screen mode (opt-in) |
| - | ------------------------ | ------------------------- |
| Footprint | Card at top-right, 360 wide | Content centered on the primary display, scrim on every display |
| Dim | Existing dim layer, `scrim-dim` 56% | Flat scrim at 80% dark, 72% light (same layer, higher opacity) |
| Warning phase | Toast, top-right, click-through | Same toast. Never full-screen: a heads-up must not interrupt |
| Rest phase | Card with ring, title, prompt, Skip, Postpone | Large ring, eyebrow, prompt, Skip, Postpone |
| Exercise cue | 40 px glyph in the header | 160 px cue above the prompt |
| Long rest | Same card, longer countdown | Same layout, `10:00` countdown |
| Intended for | People who want to keep working in view | People who want a clear break |

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

New design, not in Figma yet.

```text
 ┌──────────────────────────────────────────────────────┐   scrim over the display
 │                                                      │
 │                       EYE REST                       │   eyebrow
 │                                                      │
 │                    (  cue 160  )                     │   exercise cue, looping
 │                                                      │
 │              Look at something far away.             │   title-lg
 │                                                      │
 │                     (ring 200)                       │   ring with display countdown 5rem
 │                        0:14                          │
 │                                                      │
 │                    Skip     Postpone                 │
 └──────────────────────────────────────────────────────┘
```

| Element | Spec |
| ------- | ---- |
| Layout | One centered column, max width 480, vertical gaps 24, 32, 32 |
| Background | No card. Text sits directly on the scrim: `text-primary` on scrim must hold 4.5 against the lightest plausible desktop under a 80% scrim. Test with white under scrim (open check C3) |
| Exercise cue | Same three cues (look far, roll, blink), scaled. Motion rules in `08-motion.md` |
| Ring and countdown | Ring 200 px stroke 8 around the countdown. Countdown is the loudest element |
| Actions | Same two buttons, size `md` (44 px target, fixes V7 for this mode) |
| Exit | Scrim and content fade together over 300 ms. No slide |

Centering is allowed here and only here (G11): the screen has one subject.

## Window architecture

Existing: one overlay window (primary display) plus one click-through or click-blocking dim window
per display. V2 reuses both; no new window type.

| Layout | Component mode | Full-screen mode |
| ------ | -------------- | ---------------- |
| `positioned` (Windows, macOS, X11) | 360 by 240 window at top-right | Overlay window resized to the primary display's bounds, centered content. Dim windows unchanged, higher opacity |
| `surface` (Wayland) | Work-area window, CSS places the card | Same work-area window, CSS centers the content. Panels and the taskbar stay visible: Wayland gives apps no protocol for covering them. Documented limit |

Rules:

1. The overlay never takes keyboard focus (rule A6). Full-screen mode does not change that.
   Skip and Postpone stay reachable by pointer and by the global shortcuts (roadmap 4.12).
2. Escape does nothing. A rest is ended only by Skip, Postpone or the countdown, so that a stray
   key press cannot end it and the spec stays intact.
3. Dim windows block clicks during a rest in both modes (current `setInteractive` behavior, to be
   confirmed in code before the step). The overlay window is interactive during the rest and
   click-through during the warning, as today.
4. Display hot-plug mid-rest: the content stays on the display it started on; new displays get a
   scrim only. Moving content mid-rest is a candidate, not V2 scope.
5. Multi-monitor: content on the primary display (the display the current overlay uses). Following
   the cursor display is candidate R3.
6. Full-screen apps (video players, games): `alwaysOnTop` level tuning is unchanged. A
   full-screen exclusive game on Windows may hide the window; known and out of V2 scope.

## Preference and contract

| Item | Decision |
| ---- | -------- |
| Name | `restPresentation`: `'card' \| 'fullscreen'` |
| Stored in | `preferences.json` (UI preference, like theme and sound), not `settings.json` (scheduler durations) |
| Shared contract | `src/shared` gains the type and a validated IPC channel. Main validates the payload. Renderer receives it with the snapshot and renders accordingly; it owns no timing |
| Default | `card`. A single setting for eye rests and long rests (Q1 asks whether long rests deserve their own) |
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
| Windows | Top-right window, transparent | Overlay window sized to the display. Taskbar sits below (work area vs bounds: use full bounds, level above taskbar as today) |
| macOS | Same | Overlay at display bounds above the menu bar and Dock via the existing window level |
| Linux X11 | Same. No compositor: transparent areas may render black (known, V4) | Same risk; full display opaque scrim hides it |
| Linux Wayland | Surface window, CSS placement | Surface window, CSS centering, panels remain visible |

## Tests

| Layer | Test |
| ----- | ---- |
| Logic | View model: `restPresentation` passes through for rest, never for warning. Long rest exercise rule. `totalSeconds` ring math |
| Logic | Shared contract: channel validates payload, rejects other values. Preferences store round trip |
| Logic | Window manager (fake ports): bounds for `fullscreen` equal display bounds, restored on rest end; hot-plug keeps content display |
| jsdom | Card and full-screen render per rest kind; Skip and Postpone fire once; keyboard order; labels; no buttons in warning |
| Gallery | Both modes, both themes: no overflow at 360 by 240 (card), no clipping at 1280 by 720 (full-screen), contrast on scrim |
| e2e | Full-screen preference makes the overlay window cover the display; Skip ends it; Postpone shifts next rest. Placement per `EYEREST_PLACEMENT` |
