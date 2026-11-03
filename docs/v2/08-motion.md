# 08 Motion

Item 7. Today: ease-out transitions of 100 to 300 ms, a keyframe entrance (fade, 0.75 rem rise,
blur), press scale 0.96, a linear 1 s ring sweep, no exit animation (I11, V15). V2 moves to springs,
adds the exit, and states what must never move.

## Principles

1. Motion explains. Each animation shows where something came from or went. Nothing moves for effect.
2. Critically damped by default (damping 1): settle without bounce. Calm product, no overshoot.
3. Interruptible. Interactive elements use transitions, which retarget from the current value.
   Keyframes are for one-shot entrances only.
4. Symmetric. A panel leaves along the path it arrived.
5. Quiet while counting. The countdown never animates its digits (G12).
6. Every animation has a reduced-motion fallback stated in this document.

## Spring tokens

A spring has `response` (seconds, the period of the undamped motion) and `damping` ratio.
CSS has no spring easing, so `src/design/motion.ts` evaluates the closed-form critically damped
solution and emits a `linear()` easing with a fixed number of sample points, plus the duration at
which the motion is 98% settled (about 0.92 of `response`). Pure function, unit tested.

| Token | Response | Damping | Settles | Use |
| ----- | -------- | ------- | ------- | --- |
| `spring-standard` | 0.35 | 1.0 | 320 ms | Enter, exit, pane change, segmented indicator, switch thumb |
| `spring-quick` | 0.25 | 1.0 | 230 ms | Press release, hover fill, stepper buttons |
| `spring-gentle` | 0.5 | 1.0 | 460 ms | Full-screen scrim and content, stats bar growth |
| `spring-momentum` | 0.4 | 0.8 | 370 ms | Reserved for drag or flick. Unused in V2: nothing is draggable |

Other tokens: `--er-duration-fade` 200 ms (color and opacity), `--er-duration-tick` 1000 ms
(ring sweep only), `--er-ease-linear` (ring sweep only). Existing tokens that this replaces:
`--er-duration-base` and `--er-ease-out` for entrance; both stay until the last consumer is moved.

Electron 45 ships a Chromium that supports `linear()`. Fallback for an unsupported engine:
`cubic-bezier(0.2, 0, 0, 1)`, declared first, `linear()` declared after it.

## Catalog

| Element | Property | Token | Reduced motion |
| ------- | -------- | ----- | -------------- |
| Rest card enter | opacity 0 to 1, scale 0.96 to 1, translateY -8 to 0. Origin top right | `spring-standard` | Opacity only, 150 ms |
| Rest card exit | Reverse of enter | `spring-quick` | Opacity only, 100 ms |
| Warning toast enter and exit | Same as card | same | same |
| Full-screen enter | Scrim opacity; card opacity and scale 0.96 to 1 from its center | `spring-gentle` | Opacity, 200 ms |
| Full-screen exit | Reverse | `spring-standard` | Opacity, 150 ms |
| Warning to rest swap | Content cross-fades inside the same card, no resize | `--er-duration-fade` | Same |
| Ring progress | stroke-dashoffset per tick | linear 1 s | Same (not decorative: it is the information) |
| Countdown digits | none | none | none |
| Exercise change (inside a rest) | Text cross-fade, cue swaps with cross-fade | `--er-duration-fade` | Same |
| Button press | scale 0.96 down, back on release | `spring-quick` | No scale, fill change only |
| Hover and focus | fill and ring opacity | `--er-duration-fade` | Same |
| Switch thumb | translateX | `spring-standard` | Instant |
| Segmented indicator | translateX and width | `spring-standard` | Instant |
| Settings pane change | New pane fades in 200 ms, 8 px horizontal rise. Old pane unmounts immediately | fade | Opacity only |
| Stats bars | scaleY from baseline once, 30 ms stagger | `spring-gentle` | None |
| Theme change | Color properties cross-fade 200 ms, all transforms suppressed (M10) | fade | Instant |
| Validation message | Height and opacity | `spring-quick` | Opacity only |

Not animated, ever: countdown digits, row separators, text color on focus beyond the ring, any
looping decorative element outside the exercise cue, the tray icon.

## Exercise cues

Three looping compositions on the `eye` glyph. Loops are slow and sinusoidal (ease-in-out, not a
spring: a loop has no destination) and never faster than 4 s per cycle.

| Cue | Motion | Loop |
| --- | ------ | ---- |
| `look-far` | Pupil drifts to the upper right and the outer ring expands slightly, then returns | 6 s |
| `roll` | A dot orbits the eye once, constant angular speed, ease-in-out at the ends | 5 s |
| `blink` | Eyelid line closes and opens twice, then rests | 4 s |

Reduced motion: still frame of the cue (first frame). The prompt text is the instruction, so no
information is lost. Cues are `aria-hidden`.

## Enter and exit with the window

The window is shown and hidden by the main process. Today `hide()` runs in the same tick that
the phase leaves rest, so no exit can play (V15, I11). V2 needs the window hidden after the exit
completes.

| Option | Description | Verdict |
| ------ | ----------- | ------- |
| A. Delay `hide()` by the exit duration in `OverlayWindowManager` | Renderer reads `phase` and plays exit while main waits 240 ms | Recommended |
| B. Renderer-driven acknowledgement | Renderer sends `exit-complete`, main hides | More precise, new IPC, a stuck renderer leaves the window up |

Recommendation A with a fixed delay constant in `src/shared`. Why B loses: a lost acknowledgement
keeps an always-on-top window over the user's work, the worst failure this app can have. Trade-off:
the delay is a constant that can drift from the CSS duration, so a test asserts both come from the
same token. Skip and Postpone must feel immediate: the exit begins on the click and takes 230 ms;
click-through is restored at the start of the exit so the area below is usable at once. This is a
`main` change and needs the `npm run e2e` gate. Needs approval (Q3).

Platform note: on Linux X11 without a compositor and on Wayland surface windows, opacity and
transform of content inside a transparent window work the same as on other platforms; the risk is
the transparent area itself (known, V4).

## Performance

Animate `transform` and `opacity` only. No animation of `width`, `height`, `box-shadow` or
`filter` (the V1 entrance blur is dropped: blur on a transparent window is costly on software
rendering, and Linux GPU acceleration is off by default). The ring sweep animates
`stroke-dashoffset`, which is the one exception, already in use, one element.

## Tests

| Layer | Test |
| ----- | ---- |
| Logic | Spring solver: monotonic for damping 1, ends at 1, settle time within 2% of expectation, point count, no value above 1 for damping 1. `linear()` string generation snapshot. Token lint: no duration or easing literals in component CSS |
| Logic | Window manager (fake timers via the injected `Clock`/`Ticker`): hide delayed by the exit duration, canceled when a new phase arrives before it fires, click-through restored at exit start |
| jsdom | Components apply the right class per phase; no animation class on the countdown; reduced-motion class path exists |
| Gallery (computed style) | Under `prefers-reduced-motion: reduce`: transform durations are 0 and opacity durations are within the stated fallback. No `animation-iteration-count: infinite` outside the exercise cue |
| e2e | Overlay still visible during exit window, hidden after; Skip returns click-through immediately; existing `motion.e2e.ts` updated |
