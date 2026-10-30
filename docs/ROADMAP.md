# eyerest: Roadmap (zero to hero)

Desktop app (Linux, Windows, macOS) that reminds the user to rest their eyes.
This file is the single source of truth for where we are. Update the status column after each step.

## 1. Working agreement

1. One step at a time. No step starts before the previous step's `npm run check` is green on your machine.
2. Every step ships logic tests and UI tests where the step has logic or UI.
3. Every step ships a zip containing only new or changed files, plus the paths of deleted files.
4. Each step ends with a result report: files changed, tests added, decisions made, open questions.
5. If a step reveals a bug in an earlier step, it is fixed in the current step and noted in the report.
6. To start a step, send me its **Send this** line. To report problems, paste the raw terminal output.

Status values: `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED`.

## 2. Product spec (frozen unless we change it here)

- Work 20 min, then a 20 s eye rest. Every 3rd rest is a 10 min long rest.
- 15 s before a rest: heads-up notification with countdown.
- At rest time: countdown with text, and two buttons: `Skip` and `Postpone`.
  - Skip: ends this rest. Next rest in 20 min.
  - Postpone: next rest in 5 min. All later rests shift by the same amount.
- All UI is an always-on-top overlay at the top-right of the screen.
- At rest time only: dim the screen with a grayish layer and pause any playing media.

Interpretations already made in Step 1.1:

- A skipped rest counts toward the "every 3rd rest is long" cycle. A postponed one does not.
- Skip and Postpone exist only during the rest, not during the 15 s warning.
- A late wake from sleep starts the rest from the current time, full length.

## 3. Technical decisions

| Area | Decision | Reason |
| ---- | -------- | ------ |
| Shell | Electron | One codebase for Linux, Windows, macOS. Mature overlay and tray APIs. |
| Language | TypeScript, strict | Shared types across main, preload, renderer. |
| Build | electron-vite | One config for main, preload, renderer. |
| Renderer | React | Component testing is simple and well supported. |
| Logic tests | Vitest (node) | Already in place. |
| UI tests | Vitest + jsdom + Testing Library | Fast, runs in CI without a display. |
| E2E tests | Playwright (Electron) | Real window smoke tests per OS. |
| Packaging | electron-builder | AppImage/deb, NSIS, dmg. |
| CI | GitHub Actions matrix: ubuntu, windows, macos | Cross-OS behavior is the main risk. |

Architecture rules:

- `src/core` stays pure: no Electron, no DOM, no Node-only APIs except timers via ports.
- Side effects (overlay, dim, media, tray, storage) are adapters behind interfaces. Each adapter has a fake for tests.
- Main process owns the scheduler. Renderer is a view: it receives state, sends intents (`skip`, `postpone`).
- IPC channels are typed in one shared contract file. No string literals elsewhere.

Known platform risks (we handle them in the step that owns them):

- Linux Wayland restricts window positioning and always-on-top. X11 works fully. We test both and document limits.
- macOS has no public API to read or control "now playing" for all apps. Step 1.7 specifies the fallback.
- Windows needs `alwaysOnTop` level tuning to stay above fullscreen video players.

## 4. Progress board

| Step | Title | Status |
| ---- | ----- | ------ |
| 1.1 | Core engine and scheduler | DONE |
| 1.2 | Overlay UI components | DONE |
| 1.3 | Typed IPC and main-process wiring | DONE |
| 1.4 | Overlay window manager | DONE |
| 1.5 | Screen dim layer | DONE |
| 1.6 | Media control port and Linux adapter | PARTIAL DONE (browser pauses; VLC and Spotify do not; research pending) |
| 1.7 | Media adapters for Windows and macOS | PAUSED (needs research; do not start before your research) |
| 1.8 | App lifecycle: tray, single instance, settings file | DONE |
| 1.9 | Packaging, CI matrix, E2E smoke | DONE |
| 2.1 | Design direction and tokens | DONE (colors, type, layout, elevation, motion, CSS wiring; font files pending, see docs/design-system.md) |
| 2.2 | Primitive components | IN PROGRESS (Button, Surface, Text, Countdown, ProgressRing, Icon done; 2.2e pending) |
| 2.3 | Overlay-specific components, motion, accessibility | TODO |
| 2.4 | Component gallery and visual regression baseline | TODO |
| 3.1 | Apply design system to overlay UI | TODO |
| 3.2 | Apply design system to dim layer, tray, app icon | TODO |
| 3.3 | Polish pass and visual regression update | TODO |
| 4.x | Feature backlog (chosen together) | TODO |

---

## Phase 1: Foundation (minimal features, no visual polish)

Goal: the full spec works on all three OSes with plain, unstyled UI. Phase exit criteria:

- All spec behavior works on Linux, Windows, macOS.
- `npm run check` is green locally and in CI on all three OSes.
- An installable build exists for each OS.

### Step 1.1: Core engine and scheduler (DONE, confirmed green)

- Delivered: `src/core` (config, state, engine, scheduler), tests for each.
- Done when: `npm run check` is green on your machine.
- Send this: `Step 1.1 confirmed green` and paste the passing output.

### Step 1.2: Overlay UI components

Scope:

- Add React, Testing Library, jsdom. Add `src/renderer` with plain unstyled components.
- Pure view-model function: `toOverlayViewModel(snapshot)` returns what the UI needs (`mode: hidden | warning | rest`, `secondsRemaining`, `restKind`, `title`, `message`, which buttons are enabled). All text lives here, not in components.
- Components: `WarningNotice` (text + countdown), `RestPanel` (text + countdown + Skip + Postpone), `Overlay` (chooses between them from the view model).
- Components take props and callbacks only. No IPC, no Electron.

Tests:

- Logic: view-model for every phase, eye vs long rest text, countdown formatting (`20`, `9:59`), zero state.
- UI: renders nothing when hidden; warning shows countdown and no buttons; rest shows both buttons; clicking calls `onSkip` / `onPostpone` once; buttons are keyboard operable; countdown updates when props change.

Done when: `npm run check` is green, and a `npm run dev:renderer` page lets you click through states with a fake snapshot (a small dev harness, not shipped).

Send this: `Start Step 1.2`

### Step 1.3: Typed IPC and main-process wiring

Scope:

- Add Electron and electron-vite. Create `src/main`, `src/preload`, `src/shared`.
- `src/shared/ipc.ts`: channel names, payload types, and the API type exposed to the renderer.
- Main: creates `RestScheduler`, forwards snapshots to the renderer, handles `skip` and `postpone` intents.
- Preload: exposes a minimal typed bridge via `contextBridge` (no Node access in renderer, `contextIsolation` on).
- Renderer: a hook `useSchedulerSnapshot()` that subscribes through the bridge and feeds `Overlay`.
- One temporary normal window to run the app. The real overlay window is Step 1.4.

Tests:

- Logic: main-side controller with a fake scheduler and a fake window sender (intents reach the scheduler, snapshots reach the sender, unsubscribe on dispose).
- UI: `useSchedulerSnapshot` and `Overlay` with a fake bridge: snapshot updates re-render; button clicks send the right intent.
- Contract test: every channel in `ipc.ts` has a handler and a preload binding.

Done when: `npm run dev` opens a window, the real scheduler runs, you can shorten durations via an env var (`EYEREST_FAST=1` gives 20 s work, 5 s warning, 5 s rest) and see all states.

Send this: `Start Step 1.3`

### Step 1.4: Overlay window manager

Scope:

- `OverlayWindowManager` adapter: frameless, transparent, always-on-top, no taskbar entry, not resizable, positioned top-right of the primary display with a margin.
- Pure function `computeOverlayBounds(display, size, margin)` with no Electron dependency.
- Show on `warning` and `rest`, hide on `working` and `idle`. Show without stealing keyboard focus where the OS allows.
- Always-on-top level set high enough to sit above fullscreen apps on macOS and Windows.
- Recompute bounds on display change (monitor plugged, resolution change).

Tests:

- Logic: `computeOverlayBounds` for several resolutions, scale factors, work-area offsets (taskbar on any edge), tiny screens.
- Logic: manager with a fake window factory: show/hide per phase, bounds recomputed on display change, no double-create.
- UI: unchanged from 1.2. Add a Playwright smoke test that launches the app in fast mode and asserts the overlay window appears and then disappears.

Done when: in fast mode you see the overlay appear top-right above other apps on your OS, then disappear.

Send this: `Start Step 1.4`, plus your OS and desktop environment (and X11 or Wayland on Linux).

### Step 1.5: Screen dim layer

Scope:

- `DimLayer` adapter: one borderless, click-through-or-blocking window per display (decision below), grayish semi-transparent, shown only during `resting`, below the overlay window.
- Fade in and out kept minimal (opacity animation only).
- Open decision, answered before the step starts: should the dim layer block clicks (forces focus on resting) or let clicks pass through (less intrusive)? Default proposal: block clicks except on the overlay window.

Tests:

- Logic: one dim window per display; windows added or removed on display change; shown on `rest-started`, hidden on rest end, skip, postpone, and stop; hidden on app quit.
- Logic: z-order rule (dim below overlay) encoded in a testable helper.
- UI: Playwright smoke: rest shows dim windows, skip removes them.

Done when: during a rest all monitors are dimmed, and skip or postpone restores them immediately.

Send this: `Start Step 1.5` with your answer to the click-blocking question.

### Step 1.6: Media control port and Linux adapter

Scope:

- Port `MediaController { pauseIfPlaying(): Promise<PausedHandle | null> }` in `src/shared` or `src/main/media`. The returned handle records which players we paused so a later feature can resume them.
- Wire it: call on `rest-started` only. Never on warning. Failures are logged and never break the rest.
- Linux adapter via MPRIS over D-Bus: list players, pause only those with `PlaybackStatus = Playing`.
- A `NullMediaController` for unsupported environments.
- Open decision: resume media after the rest? Spec says pause only. Default: do not resume in Phase 1; revisit in Phase 4.

Tests:

- Logic: port wiring with a fake controller (called once per rest start, not on warning, not on skip or postpone, errors swallowed and logged).
- Logic: MPRIS adapter with a fake D-Bus client: pauses only playing players, ignores paused or stopped, handles zero players and D-Bus failure.

Done when: on Linux, a playing browser or Spotify tab pauses at rest start. Other OSes use `NullMediaController` until 1.7.

Status: PARTIAL DONE. Port, wiring, null controller and the Linux MPRIS adapter (via `busctl`) are delivered and tested. Real-player results on Linux: a browser (YouTube) pauses; VLC does not; Spotify does not. Open research (yours): why VLC and Spotify do not pause (for example the MPRIS plugin disabled in VLC, packaged Spotify such as snap or flatpak using a different bus name or sandbox, or whether they appear on the session bus at all). No further media work until that research is done.

Send this: `Start Step 1.6`

### Step 1.7: Media adapters for Windows and macOS

Scope:

- Windows: query Windows media sessions (SMTC) and pause only playing sessions. Implementation uses a small helper process invoked from the adapter.
- macOS: there is no public API to pause arbitrary apps. Approach we decide at the start of the step after a short spike: (a) a helper that reads now-playing state and sends the media key only when something is playing, or (b) per-app AppleScript for Music, Spotify, and browsers as a fallback.
- Adapter selection by `process.platform` in one factory function.
- A written compatibility table in `docs/media.md`: which players are supported per OS.

Tests:

- Logic: each adapter against a fake command runner (parses the helper output, pauses only playing, handles helper missing, timeout, malformed output).
- Logic: factory returns the right adapter per platform.
- Manual test checklist file `docs/manual-media-test.md` (real players are not testable in CI).

Done when: media pauses on Windows and macOS for the players listed in the compatibility table.

Status: PAUSED. It needs research first and does not start before the owner's media research is finished. Every later task that depends on media pausing (4.4 Resume media after rest, the compatibility table and manual media checklist) is paused with it.

Send this: `Start Step 1.7`, plus a statement of which players you use daily (browser, Spotify, VLC, etc.), only after the research is done.

### Step 1.8: App lifecycle: tray, single instance, settings file

Scope:

- System tray icon (plain placeholder) with: Pause/Resume reminders, Quit. Status text shows the next rest time.
- Single instance lock. Second launch focuses nothing and exits.
- App starts the scheduler on launch and does not show a main window.
- Settings: JSON file in the user data dir, loaded through `createConfig` validation. Invalid file falls back to defaults and is reported, never crashes.
- `Pause` maps to scheduler `stop`; `Resume` maps to `start`. Pause hides all overlays and dim windows immediately.

Tests:

- Logic: settings loader (missing file, invalid JSON, invalid values, partial overrides, atomic save).
- Logic: tray controller with fake tray: menu state per scheduler state, pause hides adapters, resume restarts the cycle.
- Logic: single-instance guard with a fake app object.
- UI: Playwright smoke: app launches with no visible window.

Done when: app runs in the tray only, pause and resume work, settings file overrides durations.

Send this: `Start Step 1.8`

### Step 1.9: Packaging, CI matrix, E2E smoke

Scope:

- electron-builder config: Linux (AppImage and deb), Windows (NSIS), macOS (dmg). Unsigned for now; signing is a Phase 4 item.
- GitHub Actions: on push and PR, matrix `ubuntu-latest`, `windows-latest`, `macos-latest`: install, typecheck, unit tests, UI tests, build. Playwright E2E on each OS (Linux under `xvfb`).
- Scripts: `npm run build`, `npm run package`, `npm run e2e`.
- `docs/RUNNING.md`: dev, test, package instructions.

Tests:

- E2E: fast-mode full cycle (warning, rest, skip, next work period) on each OS in CI.
- Config test: package config validity check.

Done when: CI is green on all three OSes and installers build as artifacts.

Phase 1 exit review: we run through the spec line by line on your machine and tick each item.

Send this: `Start Step 1.9`

---

## Phase 2: Design system

Goal: a reusable, documented design system with tokens, primitives, and overlay-specific components. No application of it to the app yet except in the gallery.

### Step 2.1: Design direction and tokens

Scope:

- Discovery: I ask for subject context, audience, tone, and references. The product is a wellbeing tool used while people work, so calm and non-intrusive is the starting hypothesis; we confirm or change it.
- Output: a short design brief, then token files: color (with light and dark), type scale, spacing, radius, elevation, motion durations and easings, z-index layers.
- Tokens live in one source file (`src/design/tokens.ts`) and generate CSS custom properties.
- Contrast rules: every text and surface pair meets WCAG AA. The overlay must stay legible on top of any content, including over the grayish dim layer.

Tests:

- Logic: token schema validation (no missing values in light or dark), generated CSS contains every token, contrast checker asserts AA for every declared text/surface pair.

Done when: you approve the direction. This is a decision gate, not only code.

Send this: `Start Step 2.1` and any visual references you like or dislike.

### Step 2.2: Primitive components

Scope: `Button` (primary, secondary, quiet; sizes; disabled), `Text` (roles from the type scale), `Surface` (panel with elevation), `Countdown` (numeric display), `ProgressRing` (circular time remaining), `Icon` (small set).

- Components consume tokens only. No raw hex or pixel values in components.

Tests:

- UI: each variant renders; disabled button does not fire; focus ring is visible; roles and labels correct; ProgressRing clamps 0 to 100 percent.
- Logic: lint-style test that fails if component CSS contains raw color literals.

Done when: all primitives are covered and the gallery harness shows them.

Send this: `Start Step 2.2`

### Step 2.3: Overlay-specific components, motion, accessibility

Scope:

- Composed components: `WarningToast`, `RestCard`, `RestActions` built from primitives.
- Motion: enter and exit transitions, countdown tick treatment. Respect `prefers-reduced-motion`.
- Accessibility: live region announcements for warning and rest start (polite, not per-second), focus order, keyboard shortcuts for Skip and Postpone, high-contrast mode.
- Copy: final text for all states, written for the end user. Strings live in one file to prepare for localization.

Tests:

- UI: reduced motion disables transitions; live region fires once per phase, not per tick; shortcuts trigger actions; high-contrast tokens applied.
- Logic: copy file has no missing keys per state.

Done when: components are complete and accessible in the gallery.

Send this: `Start Step 2.3`

### Step 2.4: Component gallery and visual regression baseline

Scope:

- A gallery page (dev-only) listing every component and state, light and dark.
- Playwright screenshot baselines for each component and state.
- `docs/design-system.md`: tokens, components, usage rules, do and don't.

Tests: visual regression baselines committed; CI compares them (Linux baseline only, to avoid cross-OS font drift).

Done when: gallery and docs are complete and baselines pass.

Phase 2 exit review: you sign off the design system.

Send this: `Start Step 2.4`

---

## Phase 3: Apply the design system

Goal: the shipped app uses the design system everywhere. No behavior changes.

### Step 3.1: Apply to overlay UI

Scope: replace the Phase 1 unstyled components in `Overlay` with the Phase 2 components. Remove the old ones. Behavior is unchanged.

Tests: all Phase 1 UI tests still pass unchanged (this proves no behavior drift); new visual baselines for the real overlay in each state.

Send this: `Start Step 3.1`

### Step 3.2: Apply to dim layer, tray, app icon

Scope: dim color and opacity from tokens; tray icon set (template image on macOS, light and dark variants on Windows and Linux); app icon for installers; installer artwork where the builder supports it.

Tests: logic tests that every required icon size and variant file exists and is referenced by the builder config; dim layer reads its values from tokens.

Send this: `Start Step 3.2`

### Step 3.3: Polish pass and visual regression update

Scope: spacing and timing review on real hardware, multi-monitor and HiDPI checks, dark and light desktop themes, fix defects found.

Tests: update baselines; add regression tests for each defect fixed.

Phase 3 exit review: full spec run-through on all three OSes with the final look.

Send this: `Start Step 3.3`

---

## Phase 4: Additional features (chosen together)

We pick and order these when Phase 3 closes. Each becomes its own step with the same format: scope, tests, done-when. Candidates:

| Id | Feature | Notes |
| -- | ------- | ----- |
| 4.1 | Settings window | Edit durations, long-rest cadence, postpone length. Uses the existing validated config. |
| 4.2 | Idle detection | Pause the work timer when the user is away; reset after a long absence. |
| 4.3 | Launch at login | Per-OS autostart behavior. |
| 4.4 | Resume media after rest | Uses the handle returned by the media controller. PAUSED: depends on the media research (Steps 1.6 and 1.7). |
| 4.5 | Sound cues | Soft sound at rest start and end, volume and mute setting. |
| 4.6 | Guided eye exercises | Short animated prompts during the 20 s rest (look far, rotate eyes, blink). |
| 4.7 | Do not disturb | Skip rests during fullscreen presentations or calls. |
| 4.8 | Working hours schedule | Active days and hours. |
| 4.9 | Stats | Rests taken, skipped, postponed per day, local only. |
| 4.10 | Localization | English and Persian, including right-to-left layout. |
| 4.11 | Auto-update and code signing | Needed for smooth installs on Windows and macOS. |
| 4.12 | Global shortcuts | Skip or postpone without the mouse. |

Send this to begin Phase 4: `Plan Phase 4` with the features you want and their priority.

---

## 5. Step report template (I fill this at the end of every step)

```markdown
Step: <id and title>
Files: new <n>, changed <n>, deleted <list>
Tests added: logic <n>, UI <n>, E2E <n>
Decisions made: <list>
Open questions: <list>
Run: npm install && npm run check
Next: <next step id>
```

## 6. Your checklist per step

1. Unzip over the project (zip contains only new and changed files).
2. `npm install`
3. `npm run check`
4. Manual check described under the step's "Done when".
5. Send the next **Send this** line, or paste the failing output.
