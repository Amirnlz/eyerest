# 07 Inputs and forms

Item 6. Today: one input primitive (`NumberField`, a digits-only text input with `inputMode`
numeric, unit, hint, error), a working-hours form with weekday toggles and time fields, and
`Button` (primary, secondary, quiet). V2 defines the full control set the settings window needs.

## Shared rules

| Rule | Spec |
| ---- | ---- |
| Target | 44 px minimum height for any control a pointer must hit (closes V7 for new controls) |
| Label | Always visible, `body` role, left of the control inside the row. No placeholder as label |
| Hint | `caption`, `text-secondary`, under the label, linked with `aria-describedby` |
| Fill | `surface-raised`. Edge `border-subtle` hairline. Radius `md` |
| Focus | 2 px `focus-ring`, 2 px offset, on `:focus-visible` only. Same ring on every control |
| Hover | `overlay-hover` over the fill |
| Pressed | `overlay-pressed`, scale 0.98 on buttons only (not on inputs) |
| Disabled | `text-disabled`, fill at 50% opacity token, `cursor: default`, not focusable |
| Error | No red. Error is shown by: an `alert` icon, the message text, `aria-invalid="true"`, and a 2 px `text-primary` edge. Information never depends on hue (F1 spirit, G15) |
| Boundary contrast | Edge or fill-to-panel 3:1 (open check C1) |
| Motion | Border and fill changes 150 ms. Reduced motion keeps them (opacity-class change) |

## Controls

### Stepper field (replaces `NumberField`)

```text
  Work interval                       ( − )  20  ( + )  min
  How long you work before a rest.
```

| Part | Spec |
| ---- | ---- |
| Layout | Group `surface-raised`, radius `full`, height 36 (row is 56). Minus and plus are 36 px circles inside, value between, unit as `caption` outside the group |
| Value | Editable text input, tabular numerals, `inputMode="numeric"`, digits only (kept from I2), width fits 3 digits |
| Buttons | `minus` and `plus` icons, repeat on hold after 400 ms at 100 ms, stop at min or max (disabled state) |
| Keyboard | Up and Down arrows step by 1. Page Up and Page Down step by 10. Home and End jump to min and max |
| Validation | Range check on blur and on Save. Message "Enter a number from 10 to 40." |
| ARIA | Input is a `spinbutton` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`; buttons labeled "Decrease work interval", "Increase work interval" |
| Why a stepper | Typing exact values stays possible, and one-step adjustment needs no keyboard. Slider rejected (Decisions D7) |

### Switch

| Part | Spec |
| ---- | ---- |
| Size | 40 by 24 track, 20 thumb, radius `full` |
| Off | Track `surface-raised` with hairline, thumb `text-secondary` |
| On | Track `accent-progress`, thumb `surface-base` |
| Semantics | `role="switch"`, `aria-checked`, label click toggles |
| Keyboard | Space toggles |
| Use | Boolean settings: working hours on or off, guided exercises |

On/off is not color alone: the thumb position differs and `On` and `Off` are in the accessible
name state.

### Segmented control

| Part | Spec |
| ---- | ---- |
| Layout | Group `surface-raised`, radius `full`, 2 px inset; selected segment `surface-panel` raised pill that slides between options |
| Segments | 2 to 3 options, equal width, `label` role, optional 16 px icon |
| Semantics | `role="radiogroup"` with `role="radio"` segments, roving tabindex, arrows move selection |
| Use | Theme (System, Light, Dark), Rest display (Card, Full screen) |
| Why not a select | Three options fit inline and each shows its choice. A select hides them |

### Weekday chips

Seven toggle buttons, 36 px circles, `label` role single letter plus full name in the accessible
name (`Monday`). Selected: `accent-progress` fill with `surface-base` text (checked 4.5 in both
themes). Roving focus group, Space toggles. Replaces the current weekday control visually; the
model (`schedule-model.ts`) is unchanged. In RTL the order follows the locale's week start.

### Time field

Native `<input type="time">` styled with the shared fill and edge, 24-hour format as today.
Reason: native pickers are accessible and localized for free; a custom wheel would be a large,
hard-to-test dependency with no gain. Chromium's inner pieces get tokenized fonts and colors only.
Error "Enter a time such as 09:00." and the end-before-start rule stay (existing logic).

### Buttons

| Variant | Use | Fill | Label |
| ------- | --- | ---- | ----- |
| `secondary` | Postpone, Save, Restore | `surface-raised` | `text-primary` |
| `quiet` | Skip, Close, Discard | transparent, `overlay-hover` on hover | `text-primary` |
| `primary` | Does not exist in V2 for the rest card. In settings, Save uses `secondary` | none | none |

Sizes: `sm` 32 (overlay only, desktop pointer; keyboard shortcuts available), `md` 44. Radius
`full`. Optical padding when an icon is present (S5). Focus ring as shared.

Open decision Q4: whether Save deserves one filled `accent-progress` button. Recommendation: no.
Settings has no emergency; a filled blue button is where attention drifts toward the app (G9).

## Form behavior

| Topic | Rule |
| ----- | ---- |
| Layout | Row per field, label left, control right, errors under the row. Never a two-column field grid |
| Validation timing | On blur and on submit. Never on first keystroke |
| Error summary | One live message at the bottom: "Fix the highlighted fields to save." Focus moves to the first invalid field on a failed Save |
| Submit | Enter in a field submits. Save disabled until valid and dirty |
| Autofill and spellcheck | `autocomplete="off"`, `spellcheck="false"` on numeric fields |
| Text scaling | Rows grow in height; controls do not clip at 200% text size (asserted in gallery) |

## Tests

| Layer | Test |
| ----- | ---- |
| Logic | Stepper model: step, clamp, page step, hold repeat schedule (pure timing function), digits-only filtering, range message. Weekday and time models exist; extend |
| jsdom | Each control: renders, roles and names, keyboard (arrows, Home, End, Space, Page keys), disabled does not fire, error state sets `aria-invalid` and `aria-describedby` and shows the icon, focus ring class on keyboard only, controlled value updates |
| Gallery | All controls and states in light, dark, forced-colors: edge visible in forced-colors, focus ring contrast, 44 px target heights, 200% text no clip |
| e2e | Settings form: type a value, step with buttons, Save, scheduler receives it. Existing settings e2e extended |
