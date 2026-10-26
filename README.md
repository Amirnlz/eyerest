# eyerest

Cross-platform desktop app (Linux, Windows, macOS) that reminds the user to rest their eyes.

## Behaviour (spec)

- Work 20 min, then a 20 s eye rest. Every 3rd rest is a 10 min long rest.
- 15 s before a rest, a heads-up countdown appears.
- During a rest: countdown + `Skip` and `Postpone` buttons.
  - Skip: ends this rest, next rest in 20 min.
  - Postpone: next rest in 5 min; all later rests shift by the same amount.
- Overlay at top-right, always on top. At rest time the screen is dimmed and media is paused (later steps).

## Project phases

1. Foundation, minimal features (current)
2. Design system
3. Apply design system
4. Extra features

## Phase 1 progress

| Step | Scope | Status |
| ---- | ----- | ------ |
| 1 | Project scaffold, core engine (pure state machine), scheduler service, logic tests | this archive |
| 2 | Overlay UI (warning + rest views, Skip/Postpone) with UI tests | next |
| 3 | Electron shell: top-right always-on-top overlay window, screen dim, tray | planned |
| 4 | Media pause adapters per OS (MPRIS / media keys / system APIs) | planned |
| 5 | Packaging for Linux, Windows, macOS | planned |

## Architecture

```
src/core/
  config.ts     RestConfig, defaults, validation
  state.ts      EngineState / EngineAction / EngineEvent types, remainingMs()
  engine.ts     transition(state, action, config): pure, no I/O, no clock
  scheduler.ts  RestScheduler: drives the engine via injected Clock + Ticker
  index.ts      public API
tests/core/     unit tests for each module
```

Design rules:

- The engine is pure. Time is passed in as `now`, so every rule is testable without timers.
- The scheduler talks to time only through the `Clock` and `Ticker` ports.
- Side effects (overlay, dimming, media pause) will be adapters that subscribe to scheduler events. They never live in the core.

## Decisions made in step 1

- A skipped rest counts toward the "every 3rd rest is long" cycle. A postponed rest does not.
- `Skip` and `Postpone` are only valid during the rest itself, not during the 15 s warning.
- If the process wakes late (sleep/suspend), the rest starts from the current time and lasts its full length.

## Commands

```
npm install
npm run typecheck
npm test
npm run check     # typecheck + tests
```

Requires Node 20+.
