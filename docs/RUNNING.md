# Running eyerest

Node 22.12 or newer.

## Develop

```bash
npm install
npm run dev          # Electron app with real durations
npm run dev:fast     # EYEREST_FAST=1: 20 s work, 5 s warning, 5 s rest, 10 s long rest, 10 s postpone
npm run dev:renderer # browser harness for the overlay states (no Electron)
```

On Windows PowerShell: `$env:EYEREST_FAST=1; npm run dev`.

The app has no main window. It lives in the system tray: next rest time, Pause/Resume reminders, Quit.
Stop `npm run dev` with Ctrl+C or the tray's Quit. Only one instance runs per user: close a running
`npm run dev` before running `npm run e2e` or the packaged app.

Environment variables: `EYEREST_FAST`, `EYEREST_PLACEMENT=positioned|surface`,
`EYEREST_OZONE=x11|wayland`, `EYEREST_GPU=1`, `EYEREST_DEBUG=1`. See the README.

## Test

```bash
npm run typecheck
npm run lint
npm test             # logic tests (Node) and UI tests (jsdom)
npm run check        # typecheck + lint + tests
npm run e2e          # builds, then launches the real app with Playwright (fast mode)
```

E2E opens real windows. On a Linux machine without a display, run it under xvfb:
`xvfb-run -a npx playwright test` (after `npm run build`). On native Wayland the overlay and dim
geometry checks are skipped, because Wayland apps cannot choose window positions.

## Package

```bash
npm run package
```

Builds `out/`, then installers for the OS you run it on, into `release/`:

| OS | Output |
| -- | ------ |
| Linux | `eyerest-<version>-linux-<arch>.AppImage` and `.deb` |
| Windows | `eyerest-<version>-win-<arch>.exe` (NSIS) |
| macOS | `eyerest-<version>-mac-<arch>.dmg` |

Installers are built per OS: electron-builder cannot produce a Windows or macOS installer on Linux.
CI builds all three.

Known limits until later steps:

- Installers are unsigned. Windows SmartScreen and macOS Gatekeeper warn on first launch. On macOS,
  right-click the app and choose Open. Code signing is Phase 4 (4.11).
- The app icon is the default Electron icon, and the tray icon is a placeholder. The real icon is
  Step 3.2.
- The macOS build is for the architecture of the machine that builds it.

## CI

`.github/workflows/ci.yml` runs on every push to `master` and every pull request, on Ubuntu, Windows
and macOS: install, typecheck, lint, unit and UI tests, build, Playwright e2e (Linux under xvfb), then
package. Installers are uploaded as `installers-<os>` artifacts. A failed run uploads
`test-results/` as `e2e-results-<os>`.
