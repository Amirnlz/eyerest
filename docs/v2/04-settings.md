# 04 Settings window

Item 3. Redesign of the existing settings window (roadmap 4.1, 4.8, 4.9). Today it is one
scrolling form: durations, working hours, stats, in a 480 by 760 window.

## Problems with the current screen

| Problem | Evidence |
| ------- | -------- |
| One long scroll mixes settings with a report (stats) | `SettingsPage` stacks `SettingsForm`, `ScheduleForm`, `StatsPanel` |
| Every group is a heading plus a stack of labeled boxes: reads as a generic form | `SettingsForm` fieldset per group |
| No place for the next features (theme, sound, exercises, do not disturb, shortcuts, autostart), which live only in the tray | roadmap 4.2 to 4.13, issue I30 |
| Number entry is a bare digits field; no stepper, no unit placement convention | `NumberField` |
| Window height 760 exceeds small laptop screens | `electron-settings-window.ts` |

## Structure

Recommendation: a sidebar with panes, like macOS System Settings and Windows 11 Settings.

```text
 ┌──────────────┬───────────────────────────────────────┐   window 720 by 520, min 640 by 420
 │  Rhythm      │  Rhythm                               │   pane title (title-lg)
 │  Rest        │                                       │
 │  Schedule    │  ┌ group ─────────────────────────┐   │
 │  Appearance  │  │ Work interval     [ − 20 + ] min│   │   row: label + hint left, control right
 │  Activity    │  │ ──────────────────────────────  │   │   hairline separators, inset
 │              │  │ Heads-up          [ − 15 + ] s  │   │
 │              │  └────────────────────────────────┘   │
 │              │                                       │
 │              │  Saving restarts the work timer.      │
 │              │                     [ Restore ] [Save]│
 └──────────────┴───────────────────────────────────────┘
```

| Pane | Contents | Exists today |
| ---- | -------- | ------------ |
| Rhythm | Work interval, heads-up, eye rest, long rest, long rest every, postpone by | Yes (`SettingsForm`) |
| Rest | Rest display (card or full screen), guided exercises on or off | New control for exercises is in the tray today; display is new (`03`) |
| Schedule | Working hours on or off, active days, from, until | Yes (`ScheduleForm`) |
| Appearance | Theme: System, Light, Dark | Tray only today (I30) |
| Activity | Statistics (`05-stats.md`) | Yes (`StatsPanel`) |

Sound, do not disturb, autostart and idle detection stay in the tray in V2. They are quick
toggles. Moving them is a later decision, recorded as candidate R5. The sidebar is built to take
new panes without redesign (phase 4 scaling).

## Groups and rows

| Element | Spec |
| ------- | ---- |
| Group | `surface-panel`, hairline, radius `lg`, no shadow, 16 px side padding |
| Row | Min height 56, label (`body`) and hint (`caption`, `text-secondary`) left, control right, vertically centered |
| Separator | Hairline inset by 16 on the left, none after the last row |
| Group heading | `eyebrow` role above the group, 8 px gap. Omitted when a pane has one group |
| Footer note | `caption`, `text-secondary`, left aligned under the group |
| Pane padding | 32 |
| Sidebar | 200 wide, `surface-base`, items 36 high, radius `sm`, selected item `surface-raised` with `accent-progress` 2 px indicator at the leading edge |

No icon per sidebar item beyond the 20 px glyph from `06-icons.md` placed uncolored left of the
label (G5). No cards, no section hero, no illustration (G4, G6).

## Behavior

| Topic | Decision |
| ----- | -------- |
| Save model | Rhythm and Schedule keep explicit Save (changing durations restarts the work timer, so it must not apply per keystroke). Appearance and Rest display apply immediately: they do not restart anything |
| Dirty state | Save enabled only when the pane is dirty and valid. Leaving a dirty pane asks nothing; the draft stays until the window closes, and closing with a dirty draft shows an inline "Unsaved changes" with Save and Discard |
| Validation | Inline, under the row, on blur and on Save. Range is half to twice the default (`settings-limits.ts`, issue I14 open). Message names the range |
| Restore defaults | Per pane, in the footer, requires no confirmation (it only fills the draft, Save still needed) |
| Keyboard | Sidebar is a roving-tabindex list. Arrow keys move panes, Tab moves into the pane. Escape closes the window (existing) |
| Close | Close button stays for frameless native Wayland (I1). Other platforms use the frame |
| Status | One polite live region: "Settings saved.", "Could not save settings. Try again." No toast |
| Window | Normal framed window. Fixed initial 720 by 520, resizable, min 640 by 420. Saved position not remembered in V2 |

## Copy

Existing strings stay (`copy.ts`). New strings needed: pane names, Appearance labels
(`System`, `Light`, `Dark`), Rest display labels (`Card`, `Full screen`) with hints, unsaved
changes. Tone: plain, no punctuation flourishes (G13). All strings in `copy.ts`.

## Platform behavior

| Platform | Notes |
| -------- | ----- |
| Windows | Standard frame. Sidebar width and row height unchanged. Focus ring honors forced colors |
| macOS | Standard traffic lights. Content respects the title bar height; no custom title bar in V2 |
| Linux X11 | Standard frame |
| Linux Wayland | Native Wayland may have no decorations: Close button required (I1) |
| RTL (candidate 4.10) | Sidebar moves to the right, row control to the left. Layout uses logical properties from the start (`margin-inline`, `padding-inline`) |

## Tests

| Layer | Test |
| ----- | ---- |
| Logic | Form model: dirty, valid, restore, range errors (exists, extend for the new fields). Pane routing |
| jsdom | Sidebar roving focus and arrow keys; selected pane renders; Save disabled until dirty and valid; inline errors and `aria-invalid`, `aria-describedby`; Restore fills draft; live region text; Appearance applies immediately and calls the bridge once |
| Gallery | Each pane in light, dark, forced-colors, at min size 640 by 420: no overflow, contrast pairs |
| e2e | Open from tray, change a duration, Save, scheduler restarts with the new value; theme change applies; Escape closes. Existing `settings.e2e.ts` extended, not rewritten |
