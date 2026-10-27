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

```text
src/core/
  config.ts     RestConfig, defaults, validation
  state.ts      EngineState / EngineAction / EngineEvent types, remainingMs()
  engine.ts     transition(state, action, config): pure, no I/O, no clock
  scheduler.ts  RestScheduler: drives the engine via injected Clock + Ticker
  index.ts      public API
src/shared/     IPC contract (channel names, kinds, EyerestApi type)
src/main/       Electron main process: runtime composition, controller, IPC handlers
src/main/overlay/  top-right overlay window: bounds maths, manager, Electron adapters
src/preload/    contextBridge bridge (createBridge is Electron-free and tested)
src/renderer/   view model, copy, overlay components, App, useSchedulerSnapshot
tests/          core, main, preload, shared, renderer tests; tests/helpers has fakes
harness/        dev-only page to click through overlay states
e2e/            Playwright smoke tests that launch the real built app
```

Data flow:

```text
RestScheduler -> SchedulerController -> broadcast sender --(eyerest:snapshot)--> renderer
renderer --(eyerest:skip / postpone / get-snapshot)--> ipc handlers -> controller -> scheduler
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

Requires Node 22.12+ (Vitest 5 and Electron 45 both need it). Install dependencies before running
the app or checks.

```bash
npm install
npm run typecheck
npm test
npm run lint       # lint and formatting checks
npm run lint:fix   # apply safe lint and formatting fixes
npm run check      # typecheck + lint + tests
npm run dev:renderer   # dev harness for overlay states
npm run dev            # Electron app (real durations)
npm run dev:fast       # Electron app, EYEREST_FAST=1 (macOS/Linux shell)
npm run build          # production build into out/
npm run e2e            # build + Playwright smoke test (launches the real app)
```

## Contributing

Contributors should read [CONTRIBUTING.md](CONTRIBUTING.md) for the code style and lint rules. Run
`npm run check` before submitting a change. Use `npm run lint:fix` to apply automatic fixes;
`npm run format:check` and `npm run format` are also available as formatting aliases.

Overlay layout: where apps can position windows (Windows, macOS, Linux on X11) the overlay is a small
window at the top-right (`positioned`). On native Wayland apps cannot choose a window position, so the
overlay is a transparent window covering the work area and the panel is drawn at the top-right by CSS
(`surface`). During the warning the window is click-through; during the rest it receives clicks.
Override with `EYEREST_PLACEMENT=positioned|surface`.

Linux display and GPU: the display backend is left to Electron (`EYEREST_OZONE=x11|wayland` forces one).
Hardware acceleration is off on Linux (some GPU drivers crash the GPU process and leave windows blank);
`EYEREST_GPU=1` turns it back on.
Debug: `EYEREST_DEBUG=1` prints a line each time the overlay window is created, shown, hidden or changes mode.

Fast mode (`EYEREST_FAST=1`): 20 s work, 5 s warning, 5 s eye rest, 10 s long rest, 10 s postpone.
On Windows PowerShell: `$env:EYEREST_FAST=1; npm run dev`.

UI test files (`*.test.tsx`) start with `// @vitest-environment jsdom`. Logic tests run in Node.
