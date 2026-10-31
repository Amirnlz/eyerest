# eyerest: Issues

Single list of known problems. Severity is a proposal; the owner sets the final priority.
Status values: `OPEN`, `FIXED (in review)`, `FIXED`, `DEFERRED`, `NEEDS INFO`.
Nothing marked FIXED here has been verified by running it; the owner's `npm run check` and `npm run e2e` are the gate.

Severity: `HIGH` blocks use or a release, `MEDIUM` degrades use, `LOW` polish or tech debt.

## 1. Reported after 4.1c

| ID | Sev | Area | Problem | Status | Fix |
| -- | --- | ---- | ------- | ------ | --- |
| I1 | HIGH | Settings window | No way to close or minimize. Native Wayland windows have no client-side decorations. | FIXED (in review) | `eyerest:close-settings` IPC, Close button, Escape. Minimize not added (see I13). |
| I2 | MEDIUM | Settings UI | Number fields show up/down spin buttons. | FIXED (in review) | `NumberField` is a digits-only text input (`inputMode="numeric"`). |
| I3 | HIGH | Settings validation | No sane range: any number could be entered. | FIXED (in review) | Min and max are half and twice the default (`src/core/settings-limits.ts`), enforced in the form and in main. |
| I4 | LOW | Settings UI | Default scrollbar does not match the design system. | FIXED (in review) | Token-styled `::-webkit-scrollbar`; the page is the scroll container. |
| I5 | HIGH | e2e | `getByRole('spinbutton', {name:'Long rest'})` also matched "Long rest every" (strict-mode violation). | FIXED (in review) | `exact: true`. |
| I6 | HIGH | e2e | Click on Save times out at "visible, enabled and stable" (2 tests). Root cause unconfirmed. Hypothesis: the settings window does not paint, so `requestAnimationFrame` does not fire and the "stable" check never passes. | NEEDS INFO | Tests submit with Enter, which skips the check. Confirm with `EYEREST_DEBUG=1` (settings window now logs `ready-to-show`, `show`, `closed`) and `npm run e2e`. If the window is not shown, the bug is in the window adapter, not the test. |

## 2. Earlier issues, from the project docs

| ID | Sev | Area | Problem | Status | Source |
| -- | --- | ---- | ------- | ------ | ------ |
| I7 | MEDIUM | Media (1.6) | VLC and Spotify do not pause on Linux; a browser does. Cause unknown (MPRIS plugin off, packaged builds on another bus name). | NEEDS INFO (owner research) | ROADMAP 1.6 |
| I8 | MEDIUM | Media (1.7) | No Windows or macOS media adapter. | DEFERRED (needs research) | ROADMAP 1.7 |
| I9 | LOW | Phase 3 | Hardware pass and exit review not done. | OPEN (owner) | ROADMAP 3.3 |
| I10 | LOW | Packaging | NSIS installer artwork deferred. | DEFERRED | ROADMAP 3.2, candidate 4.14 |
| I11 | LOW | Overlay | No exit animation; `hide()` runs on the same snapshot that leaves the rest phase. | DEFERRED | design-system.md V15 |
| I12 | LOW | Design system | V7: `md` and `sm` buttons are under the 44px target. | OPEN | design-system.md V7 |

## 3. Found while fixing

| ID | Sev | Area | Problem | Status |
| -- | --- | ---- | ------- | ------ |
| I13 | LOW | Settings window | No minimize. The window is a normal framed window on Windows, macOS and X11, which already minimize. Only frameless Wayland lacks it. Candidate if wanted. | DEFERRED |
| I14 | LOW | Settings UI | Limits are half and twice the default, so a person who wants a 60 min work interval cannot set it. Product decision, easy to widen in `settings-limits.ts`. | OPEN (owner) |
| I15 | LOW | Design system | V8 (`border-strong` unused) is resolved by the settings inputs. | FIXED (in review) |
| I16 | LOW | Docs | `ROADMAP.md` working agreement still says each step ships a zip. Pushing to GitHub replaced it. | OPEN |
