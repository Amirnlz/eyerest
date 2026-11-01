# eyerest: Issues

Single list of known problems. Severity is a proposal; the owner sets the final priority.
Status values: `OPEN`, `FIXED (in review)`, `FIXED`, `DEFERRED`, `NEEDS INFO`.
Nothing marked FIXED here has been verified by running it; the owner's `npm run check` and `npm run e2e` are the gate.

Severity: `HIGH` blocks use or a release, `MEDIUM` degrades use, `LOW` polish or tech debt.

## 1. Reported after 4.1c

| ID | Sev | Area | Problem | Status | Fix |
| -- | --- | ---- | ------- | ------ | --- |
| I1 | HIGH | Settings window | No way to close or minimize. Native Wayland windows have no client-side decorations. | FIXED | `eyerest:close-settings` IPC, Close button, Escape. Minimize not added (see I13). |
| I2 | MEDIUM | Settings UI | Number fields show up/down spin buttons. | FIXED | `NumberField` is a digits-only text input (`inputMode="numeric"`). |
| I3 | HIGH | Settings validation | No sane range: any number could be entered. | FIXED | Min and max are half and twice the default (`src/core/settings-limits.ts`), enforced in the form and in main. |
| I4 | LOW | Settings UI | Default scrollbar does not match the design system. | FIXED | Token-styled `::-webkit-scrollbar`; the page is the scroll container. |
| I5 | HIGH | e2e | `getByRole('spinbutton', {name:'Long rest'})` also matched "Long rest every" (strict-mode violation). | FIXED | `exact: true`. |
| I6 | HIGH | e2e | Click on Save times out at "visible, enabled and stable" (2 tests). Root cause unconfirmed. Hypothesis: the settings window does not paint, so `requestAnimationFrame` does not fire and the "stable" check never passes. | NEEDS INFO | Tests submit with Enter, which skips the check. Confirm with `EYEREST_DEBUG=1` (settings window now logs `ready-to-show`, `show`, `closed`) and `npm run e2e`. If the window is not shown, the bug is in the window adapter, not the test. |

## 2. Earlier issues, from the project docs

| ID | Sev | Area | Problem | Status | Source |
| -- | --- | ---- | ------- | ------ | ------ |
| I7 | MEDIUM | Media (1.6) | VLC and Spotify do not pause on Linux; a browser does. Cause unknown (MPRIS plugin off, packaged builds on another bus name). | NEEDS INFO (owner research). Code now on branch `media-control-test`, not master | ROADMAP 1.6 |
| I8 | MEDIUM | Media (1.7) | No Windows or macOS media adapter. | DEFERRED (needs research). To be built on `media-control-test` | ROADMAP 1.7 |
| I9 | LOW | Phase 3 | Hardware pass and exit review not done. | OPEN (owner) | ROADMAP 3.3 |
| I10 | LOW | Packaging | NSIS installer artwork deferred. | DEFERRED | ROADMAP 3.2, candidate 4.14 |
| I11 | LOW | Overlay | No exit animation; `hide()` runs on the same snapshot that leaves the rest phase. | DEFERRED | design-system.md V15 |
| I12 | LOW | Design system | V7: `md` and `sm` buttons are under the 44px target. | OPEN | design-system.md V7 |

## 3. Found while fixing

| ID | Sev | Area | Problem | Status |
| -- | --- | ---- | ------- | ------ |
| I13 | LOW | Settings window | No minimize. The window is a normal framed window on Windows, macOS and X11, which already minimize. Only frameless Wayland lacks it. Candidate if wanted. | DEFERRED |
| I14 | LOW | Settings UI | Limits are half and twice the default, so a person who wants a 60 min work interval cannot set it. Product decision, easy to widen in `settings-limits.ts`. | OPEN (owner) |
| I15 | LOW | Design system | V8 (`border-strong` unused) is resolved by the settings inputs. | FIXED |
| I16 | LOW | Docs | `ROADMAP.md` working agreement still says each step ships a zip. Pushing to GitHub replaced it. | OPEN |
| I17 | MEDIUM | Idle (4.2) | Electron does not document `getSystemIdleTime` on native Wayland. If it reads 0 there, idle detection never triggers. Not verified on any OS. | NEEDS INFO (owner: run `EYEREST_DEBUG=1 EYEREST_FAST=1 npm run dev`, stop touching input for 3 s, look for `[idle] away`) |
| I18 | LOW | Idle (4.2) | No e2e for idle: Playwright cannot produce OS input idleness. Covered in jsdom-free logic tests (engine, policy, monitor, runtime). The e2e suite sets `EYEREST_IDLE=0`. | OPEN |
| I19 | LOW | Idle (4.2) | Threshold (60 s) has no setting. A settings field needs a new `IdleConfig` entry in the settings file and form. | DEFERRED (candidate) |
| I20 | MEDIUM | Autostart (4.3) | Nothing verified on a real OS: Windows Run key, macOS login item (unsigned build), Linux `.desktop` entry on GNOME, KDE and Xfce. Verify from an installed build (`npm run package`), not `npm run dev`. | NEEDS INFO (owner) |
| I21 | LOW | Autostart (4.3) | No e2e: Playwright cannot click a native tray menu, and a dev run reports autostart as unsupported by design. Covered by logic tests for the adapters, the factory and the tray controller. | OPEN |
| I22 | LOW | Autostart (4.3) | Linux `Exec` has no `--no-sandbox` or display flags. If the installed app needs them at login, the entry must carry them. | NEEDS INFO |
| I23 | MEDIUM | Sound (4.5) | Audio output is not verified on any OS. The e2e test proves the page called `play()` and the browser accepted it, not that anything was audible. | NEEDS INFO (owner: run `npm run dev:fast`, wait for a rest) |
| I24 | LOW | Sound (4.5) | The shipped `.ogg` files are synthesized placeholders. Replace with chosen CC0 files (see `resources/sounds/README.md`). | OPEN (owner) |
| I25 | LOW | Sound (4.5) | Changing the volume in the tray plays no preview, so the new level is only heard at the next rest. | OPEN (candidate) |
| I26 | LOW | Sound (4.5) | A rest that begins while the machine is asleep or locked still pushes a cue. Output follows the OS volume. | OPEN |

