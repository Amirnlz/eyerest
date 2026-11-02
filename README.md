# eyerest

Cross-platform desktop app (Linux, Windows, macOS) that reminds the user to rest their eyes.

## Behaviour (spec)

- Work 20 min, then a 20 s eye rest. Every 3rd rest is a 10 min long rest.
- 15 s before a rest, a heads-up countdown appears.
- During a rest: countdown + `Skip` and `Postpone` buttons.
  - Skip: ends this rest, next rest in 20 min.
  - Postpone: next rest in 5 min; all later rests shift by the same amount.
- Overlay at top-right, always on top. At rest time the screen is dimmed. Pausing media is not in the app for now (see `docs/ROADMAP.md`, steps 1.6 and 1.7).

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
src/main/dim/      screen dim layer: one window per display, manager, Electron adapters
src/main/tray/     tray icon and menu (Pause/Resume, Quit): menu model, controller, Electron adapter
src/main/settings/ settings file: parse, validate, load, atomic save; IPC payload validator; SettingsService
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
renderer --(eyerest:get-settings / save-settings)--> ipc handlers -> SettingsService -> file + controller.reconfigure
```

Design rules:

- The engine is pure. Time is passed in as `now`, so every rule is testable without timers.
- The scheduler talks to time only through the `Clock` and `Ticker` ports.
- Side effects (overlay, dimming) are adapters that subscribe to scheduler events. They never live in the core.

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
npm run package        # build + installers for this OS into release/ (see docs/RUNNING.md)
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
Debug: `EYEREST_DEBUG=1` prints a line each time the overlay window is created, shown, hidden or changes mode, and when the settings window is ready, shown or closed.

Tray and lifecycle: the app has no main window and lives in the system tray (menu: next rest time,
Pause/Resume reminders, Quit). Pause stops the scheduler and hides the overlay and dim layer at once;
Resume starts a fresh cycle. A second launch exits immediately. On Linux the tray needs a
StatusNotifier/AppIndicator host (GNOME needs the AppIndicator extension), otherwise no icon is shown.

Theme: a "Theme" submenu in the tray (System, Light, Dark; System is the default and follows the OS). The choice
lives in main (`preferences.json`, key `theme`), reaches each window in its URL (`?theme=`, so the first paint is
right) and is pushed to open windows when it changes. Only the app's own windows follow it: window frames and the
tray icon stay with the OS theme on purpose (the tray icon must contrast with the OS bar, not with this choice).
An unknown value in the file rejects the whole file (then sound and theme both fall back to defaults) and is
logged as `[preferences]`.

Do not disturb: a "Do not disturb" checkbox in the tray. While it is on, no warning, rest, overlay or sound
appears: a rest that falls due is skipped (it counts toward the "every 3rd is long" cycle, like Skip) and the next
one is a full work interval later. Turning it on during a warning or a rest ends it at once. Turning it off lets
rests come back normally. The tray status reads "Do not disturb: rests skipped" instead of the next rest time. It is
kept in memory only and starts off at every launch, so one forgotten click cannot silence the app for good. It is
independent of Pause (which stops the cycle) and of idle detection. It is manual: Electron cannot tell a
fullscreen presentation or a call, so nothing is detected automatically.

Working hours: a "Working hours" section in the settings window (off by default). It has an on/off checkbox, the
active days and one time window (`From` to `Until`, local time, `Until` excluded; `00:00` as the end means midnight).
Windows never cross midnight. Outside the window the scheduler is stopped, exactly like the tray's Pause, so no
warning, rest, sound or overlay appears; when the next window opens it starts a fresh work interval. The app checks
the clock every 30 s, so sleep, wake and clock changes are caught within that time. Saving applies at once and
does not restart the work timer. A Pause chosen by hand is never resumed by the schedule, and Resume pressed outside
the window keeps reminders running until the window next ends. Stored in `preferences.json`, key `schedule`
(`enabled`, `days` as 0 = Sunday to 6 = Saturday, `startMinute`, `endMinute`); an invalid value rejects the whole
file, like every other key. The tray shows "Paused" outside the window (a dedicated label is a candidate).
Not verified on real hardware: behavior across a daylight saving change and a long sleep.

Global shortcuts: while a rest is showing, `Ctrl+Alt+Shift+S` skips it and `Ctrl+Alt+Shift+P` postpones it
(`⌥⇧⌘S` and `⌥⇧⌘P` on macOS), from any app and without taking focus. The keys are registered when the rest starts and
released the moment it ends (completed, Skip, Postpone, Pause or Do not disturb), so no other app loses them for the
rest of the day, and Skip and Postpone stay valid only during a rest, as the spec says. During the heads-up the keys
are not held. If the OS refuses a key (another app owns it) it is logged as `[shortcuts]`, the other key still works,
and the buttons show a shortcut only for a key that was accepted: a tooltip and a description read with the button,
with no visible text in the panel (its size is fixed; a visible hint is a design decision). Windows, macOS and Linux
X11 use Electron's `globalShortcut`. Native Linux Wayland has no global key grab, so the feature is off there
(`EYEREST_OZONE=x11` forces X11). The keys are fixed for now; they cannot be changed or switched off in the UI.
Not verified on real hardware: key delivery on any OS, and the combination against other apps' shortcuts.

Statistics: every rest outcome is counted per local day in `stats.json` in the user data dir, on this machine only
(nothing is sent anywhere). `taken` is a rest that ran out by itself; `skipped` is Skip, a rest that Do not disturb
skipped or ended; `postponed` counts each use of Postpone. A rest cut short by Pause and an absence that resets
the cycle are not counted. The last 90 days are kept. The settings window shows the last 7 days and a total under
"Statistics", loaded when the window opens (it does not refresh while open). A file that cannot be read is renamed
`stats.json.bad` and counting starts again, so a corrupt file is never overwritten. The file is
`{"version":1,"days":{"YYYY-MM-DD":{"taken":n,"skipped":n,"postponed":n}}}`.

Guided eye exercises: during the 20 s eye rest the message becomes three prompts, one third of the rest each:
look far away, roll your eyes, blink. A small looping picture sits beside the text and stops under the OS
"reduce motion" setting (the still picture stays). Each new prompt is read out once by a screen reader. The 10 min
long rest keeps its static message. An "Eye exercises" checkbox in the tray turns them off (on by default; key
`exercises` in `preferences.json`, passed in the URL as `?exercises=` and pushed on change). The renderer works
the step out from the countdown it already receives, so core and the scheduler are unchanged. Not verified on a
real display yet, and the looping motion has no automated visual check.

Sound cues: a soft chime when a rest starts and one when it runs out by itself (none after Skip or Postpone).
The tray menu has a "Mute sounds" checkbox and a "Sound volume" submenu (Low 25%, Medium 50%, High 100%).
Default is on at Medium. Choices persist in `preferences.json` next to `settings.json` (keys `soundMuted`,
`soundVolume`). Main pushes each cue to the overlay window, which plays it
(`autoplayPolicy: no-user-gesture-required`); a missing file or refused playback is logged as `[sound]` and never
affects a rest. The files are `resources/sounds/rest-start.ogg` and `rest-end.ogg` (see the README there for the
rules and credits). Muting the cue does not mute other apps. Audio output is not verified on any OS yet, and the
Linux tray host's support for checkbox and radio items is untested.

Launch at login: a "Launch at login" checkbox in the tray menu, off by default, shown only in packaged builds
(a dev run would register the bare Electron binary). The OS is the source of truth and nothing is stored in
`settings.json`; the checkbox re-reads the OS after each click, so a refused change shows as unchecked and is
logged as `[autostart]`. Windows and macOS use Electron's login item API (Windows registry Run key, macOS login
item; an unsigned macOS build may be refused by the OS). Linux writes `~/.config/autostart/eyerest.desktop`
(`$XDG_CONFIG_HOME` is honoured) with the AppImage file or the installed binary as `Exec`; the entry is ignored
by desktops that do not implement XDG autostart, and an entry disabled in the desktop's own startup settings
shows as unchecked. Not verified on any OS yet. The tray adapter renders a native checkbox item; whether a
Linux StatusNotifier host shows the check mark is untested.

Settings: optional JSON file `settings.json` in the Electron user data dir (Linux `~/.config/eyerest`,
macOS `~/Library/Application Support/eyerest`, Windows `%APPDATA%\eyerest`). Keys are the config fields,
all optional, durations in milliseconds: `workIntervalMs`, `warningMs`, `eyeRestMs`, `longRestMs`,
`cyclesBeforeLongRest`, `postponeMs`. A missing file means defaults. An invalid file (bad JSON or values)
is ignored as a whole, defaults apply, and the reason is printed to the console. Unknown keys are ignored
with a warning. `EYEREST_FAST=1` overrides the durations from the file.
Saving settings through IPC (`eyerest:save-settings`) validates every field in main, writes only values
that differ from the defaults, and restarts a running cycle with a fresh work interval (a paused app stays
paused). Saving unchanged values changes nothing. The tray menu has a Settings entry that opens a settings window (one at a time; opening it again focuses it).
The window is a normal framed window in the same renderer bundle, selected with `?view=settings`.
It closes with the Close button or Escape (native Wayland windows have no title-bar buttons). Fields take
digits only. Each value must lie between half and twice its default (work 10 to 40 min, heads-up 8 to 30 s,
eye rest 10 to 40 s, long rest 5 to 20 min, long rest every 2 to 6 rests, postpone 3 to 10 min); main
rejects anything outside that range. The limits live in `src/core/settings-limits.ts` and do not apply to
`settings.json` loaded at startup or to `EYEREST_FAST`.

`EYEREST_OPEN_SETTINGS=1` opens the settings window at launch (used by the Playwright settings test,
which cannot click a native tray menu).

Idle detection: after 60 s without keyboard or pointer input (`powerMonitor.getSystemIdleTime()`, polled
once per second) the work countdown freezes and the tray says "Away: timer paused". When input returns the
countdown resumes with the time that was left. If the absence lasted at least the long rest length (10 min),
it counts as a rest: a fresh work interval starts and the rest counter advances, as if the rest was skipped.
A warning or a rest in progress is never affected. `EYEREST_IDLE=0` turns it off (the e2e suite sets it);
`EYEREST_FAST=1` shortens the threshold to 3 s. Windows, macOS and Linux X11 are expected to report idle
time; Electron does not document native Wayland, where a reading of 0 leaves the feature inert. Not
verified on any OS yet. There is no setting for the threshold in this step.

Fast mode (`EYEREST_FAST=1`): 20 s work, 5 s warning, 5 s eye rest, 10 s long rest, 10 s postpone.
On Windows PowerShell: `$env:EYEREST_FAST=1; npm run dev`.

UI test files (`*.test.tsx`) start with `// @vitest-environment jsdom`. Logic tests run in Node.
