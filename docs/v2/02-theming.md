# 02 Light and dark theme

Item 1. Both themes are first class: every component, screen and test exists in both.

## Decisions

| Topic | Decision |
| ----- | -------- |
| Default | Follow the OS (`system`). Where the OS reports no preference, use light, so existing users see no change |
| Override | `system`, `light`, `dark`. Already stored in main and exposed in the tray (roadmap 4.13). V2 adds the same control to the settings window (`04-settings.md`) |
| Mechanism | Unchanged: `data-theme` on `<html>` forces a theme, no attribute follows `prefers-color-scheme`. `themedBlocks()` emits the three scopes (rule T7) |
| Token names | Identical in both themes. Components never branch on theme |
| Switching | Instant crossfade 200 ms on color properties only, with the existing transition-suppression helper so that nothing slides while colors change (rule M10) |
| Scrim | Same value in both themes. A dim layer is a physical darkening, not a theme color |

## Token mapping

See `01-foundations.md`. The structural differences between the two themes:

| Aspect | Dark | Light |
| ------ | ---- | ----- |
| Panel vs base | Panel one step lighter than base (onyx-2 on onyx) | Same tone. Hairline and card shadow separate them |
| Accent | Mist Blue, light on dark | Charcoal Blue, dark on light |
| Raised surface | Opaque graphite | Translucent onyx 8% |
| Shadow | Nearly invisible, hairline carries the edge | Visible, soft, 12% |
| Glow | Charcoal Blue | Mist Blue 40% |

## Where the theme applies

| Surface | Follows the app theme setting | Notes |
| ------- | ----------------------------- | ----- |
| Overlay (card, toast, full-screen) | Yes | Renderer window |
| Settings window content | Yes | Renderer window |
| Settings window frame and native menus | No, follows the OS | Known, issue I27. Option: `nativeTheme.themeSource` |
| Tray icon | No, follows the OS tray background | Deliberate. macOS template image, light and dark glyphs on Windows and Linux |
| Dim layer | Not themed | Flat scrim |

Rule: a forced app theme that differs from the OS only affects renderer windows. Document this in
the settings hint text: "Applies to eyerest windows."

## Platform behavior

| Platform | Behavior |
| -------- | -------- |
| Windows | `prefers-color-scheme` follows "Choose your mode". High contrast: `forced-colors` rules override both themes |
| macOS | Follows Appearance. Increased contrast uses `prefers-contrast: more` tokens (see below) |
| Linux X11 | Follows the portal or GTK setting where Chromium can read it. Without it, light |
| Linux Wayland | Same as X11. The transparent surface window never paints a background, so theme only affects the panel |

## Accessibility variants

| Media query | Change |
| ----------- | ------ |
| `prefers-contrast: more` | `border-subtle` rises to 32% alpha, `text-secondary` to 80%, hairline 2 px on inputs and buttons |
| `forced-colors: active` | System colors only. Every control keeps a visible edge (rule C12). Ring uses `Highlight`, track `GrayText` |
| `prefers-reduced-transparency: reduce` | Glow removed, scrim opacity rises to 72% |

## Tests

| Layer | Test |
| ----- | ---- |
| Logic | Token schema: every token has dark and light values. Contrast pair table passes in both themes |
| Logic | Generated CSS contains the three scopes for every themed token (T7 guard) |
| jsdom | Theme controller: `system` follows a mocked `matchMedia`; `light` and `dark` set `data-theme`; switching suppresses transitions |
| Gallery (computed style) | Each component in light, dark, forced-colors: text and edge colors resolve to the expected tokens |
| e2e | Theme setting changes the overlay `data-theme` without restart (exists for the tray; extend to the settings control) |
