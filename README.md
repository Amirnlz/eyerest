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

## Progress

See `docs/ROADMAP.md` for the full plan and the per-step status board.

## Architecture

```
src/core/
  config.ts     RestConfig, defaults, validation
  state.ts      EngineState / EngineAction / EngineEvent types, remainingMs()
  engine.ts     transition(state, action, config): pure, no I/O, no clock
  scheduler.ts  RestScheduler: drives the engine via injected Clock + Ticker
  index.ts      public API
src/renderer/   view model, copy, unstyled overlay components (no Electron, no IPC)
tests/core/     logic tests for the engine and scheduler
tests/renderer/ logic tests (node) and UI tests (jsdom, Testing Library)
harness/        dev-only page to click through overlay states
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
npm run dev:renderer   # dev harness for overlay states
```

UI test files (`*.test.tsx`) start with `// @vitest-environment jsdom`. Logic tests run in node.

Requires Node 20+.
