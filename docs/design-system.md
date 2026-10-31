# eyerest design system

This is the guide for building every visual part of eyerest. It records what exists, the rules
that govern it, the steps still to do, and where the code already breaks a rule.

It supersedes `docs/design-brief.md`, whose content is folded in here. Read sections 1 to 3 once.
Use sections 6 to 12 while coding. Section 14 is the violations register.

Rule IDs (such as `T3`, `M4`, `C7`) are stable. Tests, reviews and the register refer to them.

## 1. Direction

| Topic | Decision |
| ----- | -------- |
| Style | Soft neumorphism. Surfaces share the canvas tone. Depth comes from a paired light and dark shadow. |
| Color | Achromatic only. Pure neutral steps from white to black. No green, red, yellow or any hue. |
| Themes | Light and dark. `data-theme` forces one. With no attribute, the OS preference decides. Light is the default. |
| Motion | Very smooth: short, decelerating transitions, no bounce, no overshoot. |
| Type | Manrope (variable, bundled, OFL) first, then a system sans stack. Sizes in rem. |
| Product tone | Calm and non-intrusive. The app interrupts people while they work. |

The one tension in this direction: neumorphism is low contrast by nature, and the roadmap
requires WCAG AA. The resolution is a hard split.

- Depth is carried by shadows. Shadows are decoration.
- Everything a person must read or operate (text, control edges, focus) meets WCAG AA through
  color tokens, never through a shadow.

Every rule below follows from this split.

## 2. Status

| Step | Delivered | State |
| ---- | --------- | ----- |
| 2.1a | Color tokens, contrast math, CSS generator | Done |
| 2.1b | Typography tokens | Done |
| 2.1c | Spacing, radius, z-index, elevation tokens | Done |
| 2.1d | Motion tokens | Done |
| 2.1e | Virtual CSS module, renderer and harness wiring, theme scoping fix | Done |
| 2.2a | `Button`, stroke and opacity tokens, component CSS lint | Done |
| 2.2b | `Surface`, `Text` | Done |
| 2.1f | Open decisions: font loader, concentric radius, themed window background | Done (section 13) |
| 2.1b-2 | Manrope woff2 file added to `src/renderer/assets/fonts/` | Done |
| 2.2c | `Countdown`, `ProgressRing`, `tick` and `linear` motion tokens | Done |
| 2.2d | `Icon`, icon registry (eye, sun, moon, skip, postpone) | Done |
| 2.3a | `OverlayPanel`, `RestPanel`, `WarningNotice` built from `Surface`, `Text`, `Countdown`, `Button` and `Icon`; `surface` prop removed | Done |
| 2.3b | Overlay entrance motion (M7). Exit (M8) deferred, V15 | Done |
| 2.3c | Theme mechanism: preference, `data-theme`, OS listener, suppression (M10). The user-facing setting (store, IPC, tray entry) moves to ROADMAP candidate 4.13 | Done |
| 2.3d | Milestone announcements (A2), `VisuallyHidden`, focus policy (A6) | Done |
| 2.4a | Gallery page (`harness/gallery.html`) and computed-style checks in Chromium (`npm run e2e:gallery`) | Done |
| 2.4b | Screenshot baselines of the gallery (`toHaveScreenshot`), Linux only | Dropped by decision (see section 2). Reopen after the software is finished |
| 3.x | Apply the system to the real overlay, dim layer, tray, app icon | Planned |

## 3. Architecture

```text
src/design/tokens.ts        palette, themed color tokens, contrast pairs   (source of truth)
src/design/typography.ts    type roles
src/design/layout.ts        space, radius, stroke, opacity, z-index
src/design/elevation.ts     neumorphic elevation levels
src/design/motion.ts        durations, easings, effects, reduced-motion values
        |
        |  *-css.ts generators (pure functions returning CSS text)
        v
src/design/build.ts         buildDesignCss(): the full stylesheet
src/design/vite-plugin.ts   serves it as the module 'virtual:eyerest-design.css'
        |
        v
src/renderer/main.tsx, harness/main.tsx and harness/gallery.tsx   import 'virtual:eyerest-design.css'
src/renderer/ui/*.tsx + *.css                primitives that use only var(--er-*)
src/renderer/components/*                    overlay panels composed from the primitives
src/renderer/theme/*                         theme preference, data-theme, OS listener, transition suppression
src/renderer/announcements.ts + hooks/       milestone announcements for the live region
```

Properties of this design:

- `src/design` is pure TypeScript. No DOM, no Electron, no React. Token logic is tested in Node.
- Values exist once. CSS is generated, never hand-written, so TypeScript and CSS cannot drift.
- Components read CSS variables only. A token edit needs no component change.
- The generated sheet sets no global background. On Wayland the overlay window is transparent
  and the panel is placed by CSS (the `surface` layout). A body background would break it.
- Token edits need a dev-server restart, because the plugin reads tokens when the config loads.

## 4. Token reference

CSS variable names use the prefix `--er-`. Never write a value that a token already holds.

### 4.1 Color

Palette: 17 neutral steps. Every step has equal r, g and b (a test enforces this). Components
never use palette steps, only the semantic tokens.

| Step | Hex | Step | Hex |
| ---- | --- | ---- | --- |
| `neutral-0` | `#FFFFFF` | `neutral-500` | `#5C5C5C` |
| `neutral-50` | `#F2F2F2` | `neutral-600` | `#474747` |
| `neutral-75` | `#F0F0F0` | `neutral-700` | `#6E6E6E` |
| `neutral-100` | `#E3E3E3` | `neutral-800` | `#262626` |
| `neutral-150` | `#EDEDED` | `neutral-850` | `#1F1F1F` |
| `neutral-200` | `#D4D4D4` | `neutral-900` | `#1A1A1A` |
| `neutral-250` | `#A0A0A0` | `neutral-925` | `#171717` |
| `neutral-300` | `#B3B3B3` | `neutral-950` | `#000000` |
| `neutral-400` | `#808080` | | |

Semantic tokens (`--er-color-<name>`):

| Token | Light | Dark | Role |
| ----- | ----- | ---- | ---- |
| `canvas` | `neutral-100` | `neutral-850` | Window and page background |
| `surface` | `neutral-100` | `neutral-850` | Panels. Same tone as canvas, by design |
| `surface-inset` | `neutral-200` | `neutral-925` | Pressed or recessed areas |
| `text-primary` | `neutral-900` | `neutral-75` | Main text |
| `text-secondary` | `neutral-600` | `neutral-300` | Helper text |
| `border-strong` | `neutral-400` | `neutral-700` | Control boundary (inputs, future) |
| `focus-ring` | `neutral-900` | `neutral-75` | Keyboard focus outline |
| `accent` | `neutral-800` | `neutral-150` | Filled primary action |
| `on-accent` | `neutral-50` | `neutral-850` | Text on the accent fill |
| `shadow-light` | white, 90% | white, 8% | Neumorphic highlight (translucent) |
| `shadow-dark` | black, 15% | black, 65% | Neumorphic shade (translucent) |
| `scrim` | black, 40% | black, 40% | Dim layer behind the overlay |
| `image-outline` | black, 10% | white, 10% | 1px inset outline on content images (S4). Pure black or white, never tinted |

Why the dark canvas is `neutral-850` and not black: a dark shadow is invisible on black. The
neumorphic pair needs a canvas lighter than the shade.

Contrast pairs. `contrastPairs` in `tokens.ts` is the allow-list of text and surface
combinations the UI may render. A test asserts each one in both themes.

| Pair | Use | Minimum | Light | Dark |
| ---- | --- | ------- | ----- | ---- |
| `text-primary` on `canvas` | body text | 4.5 | 13.56 | 14.46 |
| `text-primary` on `surface` | panel text | 4.5 | 13.56 | 14.46 |
| `text-primary` on `surface-inset` | pressed text | 4.5 | 11.74 | 15.73 |
| `text-secondary` on `canvas` | helper text | 4.5 | 7.24 | 7.86 |
| `text-secondary` on `surface` | panel helper | 4.5 | 7.24 | 7.86 |
| `text-secondary` on `surface-inset` | pressed helper | 4.5 | 6.27 | 8.55 |
| `on-accent` on `accent` | primary button label | 4.5 | 13.52 | 14.08 |
| `border-strong` on `surface` | control boundary | 3 | 3.08 | 3.23 |
| `focus-ring` on `surface` | focus indicator | 3 | 13.56 | 14.46 |
| `accent` on `surface` | primary button edge | 3 | 11.79 | 14.08 |

If a component needs a color pair that is not in the list, add the pair first, then the code.

### 4.2 Typography

`--er-font-family-sans`, and per role `--er-type-<role>-size | line-height | weight |
letter-spacing | numeric`.

| Role | Size | Line height | Weight | Tracking | Numerals | Use |
| ---- | ---- | ----------- | ------ | -------- | -------- | --- |
| `display` | 3rem | 1.05 | 600 | -0.03em | tabular | Countdown |
| `title` | 1.25rem | 1.3 | 600 | -0.01em | normal | Panel heading |
| `body` | 0.9375rem | 1.5 | 400 | 0 | normal | Messages |
| `label` | 0.875rem | 1.25 | 600 | 0.005em | normal | Buttons |
| `caption` | 0.75rem | 1.4 | 500 | 0.01em | normal | Helper text |

### 4.3 Space, radius, stroke, opacity, z-index

| Group | Tokens |
| ----- | ------ |
| Space (`--er-space-<n>`) | 0, 1, 2, 3, 4, 5, 6, 8, 10, 12. One step is 0.25rem (a 4px grid). |
| Radius (`--er-radius-<name>`) | `sm` 0.5rem, `md` 1rem, `lg` 1.5rem, `full` 9999px |
| Stroke (`--er-stroke-<name>`) | `hairline` 1px, `focus` 2px, `focus-offset` 3px |
| Opacity (`--er-opacity-<name>`) | `disabled` 0.5 |
| z-index (`--er-z-<name>`) | `base` 0, `raised` 10, `overlay` 100 |

Strokes stay in px on purpose: a rem hairline turns blurry when the font size scales. They are
still referenced by variable, so component CSS never contains a px literal.

### 4.4 Elevation

`--er-elevation-<name>`. Light source is top-left. Each level has two layers: `shadow-light`
up-left, `shadow-dark` down-right. Inset levels put both layers inside the surface.

| Level | Offset | Blur | Use |
| ----- | ------ | ---- | --- |
| `flat` | none | none | No depth |
| `raised-sm` | 0.25rem | 0.5rem | Buttons |
| `raised-md` | 0.5rem | 1rem | Panels |
| `raised-lg` | 0.75rem | 1.5rem | Overlay panel, highest emphasis |
| `inset-sm` | 0.125rem | 0.25rem | Pressed buttons |
| `inset-md` | 0.25rem | 0.5rem | Wells, progress tracks |

### 4.5 Motion

| Token | Value | Use |
| ----- | ----- | --- |
| `--er-duration-fast` | 100ms | Hover, row highlight |
| `--er-duration-quick` | 150ms | Press, exit |
| `--er-duration-base` | 300ms | Enter, icon swap |
| `--er-duration-tick` | 1000ms | One scheduler tick. Progress sweeps only |
| `--er-ease-out` | `ease-out` | Everything except the icon swap |
| `--er-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Icon cross-fade only |
| `--er-ease-linear` | `linear` | Progress sweeps only |
| `--er-motion-press-scale` | 0.96 | Pressed scale |
| `--er-motion-enter-offset` | 0.75rem | Enter moves up into place |
| `--er-motion-exit-offset` | -0.75rem | Exit moves up and out, fixed distance |
| `--er-motion-blur` | 0.25rem | Blur on enter and exit |
| `--er-motion-stagger` | 100ms | Delay between entrance chunks |

Under `prefers-reduced-motion: reduce` the effect tokens go neutral (scale 1, offsets 0, blur 0).
Durations stay, so the opacity fade still plays. Components therefore need no per-component
reduced-motion query for these effects (rule M6 covers when they still do).

## 5. Theming

- `themedBlocks()` in `src/design/theme-scope.ts` emits three scopes: light and default, forced
  dark through `[data-theme='dark']`, and OS dark through `prefers-color-scheme` when no attribute
  is set.
- Rule T7: a custom property whose value uses `var(--er-color-*)` must be declared through
  `themedBlocks()`, never on a bare `:root`. A `var()` resolves on the element that declares it,
  so a bare `:root` declaration keeps light colors inside `[data-theme='dark']`. Elevation hit
  this bug once. A test now guards it.
- To switch themes at runtime, set `data-theme` on `document.documentElement`. Remove the
  attribute to return to the OS preference. The transition-suppression recipe in section 9 is
  mandatory when this is built.

## 6. The rules

Each rule has an ID, the rule, and how it is enforced. Enforcement `test` means a failing test.
`review` means nobody checks it automatically, so a reviewer must.

### 6.1 Foundations

| ID | Rule | Enforcement |
| -- | ---- | ----------- |
| F1 | Use black and white neutrals only. No hue anywhere, including tints. | test: palette is achromatic |
| F2 | Everything a person reads or operates meets WCAG AA (4.5 text, 3 non-text). | test: contrast pairs |
| F3 | Shadows carry depth only. No information relies on a shadow alone. | review |
| F4 | No remote fonts, images or scripts. The CSP is `default-src 'self'`. | review |
| F5 | The design system never reads the clock, Electron or the DOM in `src/design`. | review |
| F6 | One concern per change. Tokens, components and wiring ship in separate steps. | review |

### 6.2 Tokens

| ID | Rule | Enforcement |
| -- | ---- | ----------- |
| T1 | Add a value in `src/design` first. CSS is generated from it. Never hand-write a token in CSS. | review |
| T2 | Components use semantic tokens, never palette steps. | review |
| T3 | Every new color pair is added to `contrastPairs` before use. | review |
| T4 | Sizes are rem. Only the stroke tokens are px. | test: type CSS has no px; component CSS has no px |
| T5 | Every token exists in both themes, with no extras. | test |
| T6 | Every token group has a generator test that checks each variable is declared once. | test |
| T7 | Theme-dependent variables go through `themedBlocks()`. | test |
| T8 | A new token group is appended in `buildDesignCss()`. | test: included in full sheet |

### 6.3 Components

| ID | Rule | Enforcement |
| -- | ---- | ----------- |
| C1 | One folder: `src/renderer/ui/`. One `.tsx` and one `.css` per primitive. | review |
| C2 | Class prefix `er-`, BEM-like modifiers: `er-button--primary`. | review |
| C3 | Class names are built by an exported pure function (`buttonClassName`). Tests call it. | review |
| C4 | Component CSS has no raw color and no raw px. It may declare custom properties only with its own component prefix (`Surface.css` declares `--er-surface-*`), never one that shadows a token. Other components may read them. | test: `component-css.test.ts` |
| C5 | Every `var(--er-*)` used must exist in the generated sheet. | test |
| C6 | No `className` prop. Variants are typed props. This keeps the look closed and consistent. | types |
| C7 | Use native elements (`button`, `section`) so keyboard, focus and roles come free. | review |
| C8 | Components take props and callbacks only. No IPC, no Electron, no timers. | review |
| C9 | Pass through `aria-*`, `id`, `data-*`. Do not swallow them. | test per component |
| C10 | `:hover` only inside `@media (hover: hover)`. | test |
| C11 | Never `transition: all` or `will-change: all`. Never `!important`. | test |
| C12 | Keep `border: var(--er-stroke-hairline) solid transparent` under any shadow, so forced-colors mode draws an edge. Add a `forced-colors: active` block that colors it. | test per component |
| C13 | A disabled control uses `--er-opacity-disabled`, `cursor: not-allowed`, no hover, no press. | test per component |
| C14 | Focus ring is `:focus-visible` only: `outline: var(--er-stroke-focus) solid var(--er-color-focus-ring)` with `outline-offset: var(--er-stroke-focus-offset)`. Never `outline: none`. | test per component |

### 6.4 Surfaces and shape (better-ui)

| ID | Rule | Enforcement |
| -- | ---- | ----------- |
| S1 | Concentric radius: outer radius = inner radius + padding + border width. It applies to a child that fills its parent's content box with a visible, even inset, up to 24px (1.5rem). A child sitting among other content (a button under a paragraph) is not concentric with the panel. Past 24px of padding, or with asymmetric padding, treat the layers as separate surfaces and keep each radius token. | test: Surface and Button CSS contracts; computed values checked in Chromium (section 8) |
| S2 | Tight surfaces publish the inner radius. `Surface` with `padding` `xs` or `sm` sets `--er-surface-inner-radius = max(0, outer radius - padding - hairline)`. `Button` reads it with the `radius-md` token as fallback. `padding` `none`, `md` and `lg` reset it. For controls that must nest tightly, wrap them in a `Surface` with `padding="xs"` (a well). | test: `surface.test.tsx` |
| S3 | Replace a border that only creates depth with a layered translucent shadow. Keep borders on dividers, inputs and selected states. | review |
| S4 | Content images get a 1px outline, inset by 1px, in pure black or white at 10% alpha. Never a tinted neutral or the accent. Skip transparent artwork. | implemented: `Photo` and the `image-outline` token; tests in `photo.test.tsx`, `tokens.test.ts` |
| S5 | Optical alignment: give a button 2px less padding on its icon side, and nudge asymmetric glyphs in the SVG, not in CSS. | implemented for `Button` with `icon` (`--er-optical-nudge`, logical sides); glyph nudges stay in the SVG paths; tests in `button.test.tsx` |

### 6.5 Motion (better-ui)

| ID | Rule | Enforcement |
| -- | ---- | ----------- |
| M1 | Interactive state uses CSS transitions, never keyframes. Transitions retarget when reversed. Keyframes are for one-shot sequences. | review |
| M2 | Press: scale to 0.96 over 150ms with ease-out. A disabled control never scales. Provide a `static` opt-out. | test: Button CSS contract |
| M3 | High-frequency feedback (hover, press, tab switch) is 150ms or less on opacity, color or shadow. | test: duration tokens |
| M4 | Every animated change also has a static cue (color, icon, label). Motion is never the only signal. | review |
| M5 | Name the transitioned properties. Never `all`. Add `will-change` only after seeing a first-frame stutter, and name the property. | test for `all` |
| M6 | Movement, scale and blur run only without reduced motion. Under reduced motion, keep an opacity cross-fade. The effect tokens do this globally. Where CSS names `scale` in `transition-property`, drop it inside `@media (prefers-reduced-motion: reduce)`. | test per component |
| M7 | Entrance: split into semantic chunks (title, description, actions). Stagger 100ms. Each chunk: opacity, 4px blur, 12px translateY, 300ms, ease-out. Never stagger routine interactions. | implemented for the overlay panel (`OverlayPanel.css`); tests: `components.test.tsx`, `e2e/motion.e2e.ts` |
| M8 | Exit: opacity, 4px blur, a fixed -12px translateY, 150ms, ease-out. Never the container height. Slide fully out only where the destination carries meaning. | deferred, see V15: the overlay window is hidden by the main process at once, so a renderer exit would never be seen |
| M9 | Icon swap on an infrequent state change: scale 0.25 to 1, opacity 0 to 1, blur 4px to 0, 300ms, `--er-ease-standard`, both icons mounted in one grid cell. No bounce. Tab and hover-revealed icons swap instantly. | not implemented. `Icon` is static; the swap wrapper lands with its first consumer (2.3a) |
| M10 | Suppress transitions for one frame on a theme switch. See the recipe in section 9. | implemented: `src/renderer/theme/transition-suppression.ts`; tests: `transition-suppression.test.ts`, `dom.test.ts`, `e2e/theme.e2e.ts` |
| M11 | Hover-capable pointers only for hover styling. Set `-webkit-tap-highlight-color: transparent` on controls that draw their own pressed state. | test (hover); review (tap) |
| M12 | Scrollable overlays get `overscroll-behavior: contain`. | n/a until something scrolls |

### 6.6 Icons (better-ui)

| ID | Rule | Enforcement |
| -- | ---- | ----------- |
| I1 | Icons are SVG with `currentColor`. State comes from CSS color and opacity, never a second asset. | implemented: `Icon`, test checks no color literals |
| I2 | Rendered stroke follows adjacent text weight: 1.5px at 400, 2px at 500 to 600, 2.5px at 700. Use `vector-effect: non-scaling-stroke` so scaling does not change it. | implemented: `weight` prop, `non-scaling-stroke`, CSS test |
| I3 | Outline is the default. Fill marks the active or selected state. | implemented: `variant`, fill on fillable shapes only |
| I4 | One icon set per surface. Size inline icons at 1em to 1.25em. | implemented: one registry, `sm` 1em, `md` 1.25em |
| I5 | Design at render size (often 16px). It must stay recognizable there. | review |
| I6 | In RTL, mirror only direction-bound icons (arrows, chevrons, send). Never mirror logos, checkmarks, clocks or playback icons. One mirroring mechanism per element. | implemented: `mirrorInRtl` in the registry, one `scale` rule, test |

### 6.7 Accessibility

`better-accessibility` is referenced by the skill but is not in this repo. These rules apply the
parts we need.

| ID | Rule | Enforcement |
| -- | ---- | ----------- |
| A1 | Keyboard: every action works with Tab, Enter and Space. Focus is always visible (C14). | test per component |
| A2 | Countdown text uses `role="timer"`. Do not announce every second. Announce at milestones only. | implemented: `Countdown` has the role and no live region; `announcements.ts` and a polite `status` region speak entry and long-rest milestones (60 s, 10 s); tests: `announcements.test.ts`, `accessibility.test.tsx`, `e2e/a11y.e2e.ts` |
| A3 | Respect `prefers-reduced-motion` and `forced-colors`. | tests (C12, M6) |
| A4 | Target size: aim for 44px on primary actions. WCAG 2.2 AA allows 24px minimum. | review, see V7 |
| A5 | Icon-only buttons need an accessible name (`aria-label`). | test per component |
| A6 | The overlay never moves focus when it appears. It opens with `showInactive()` so the user's app keeps the keyboard, and an autofocused Skip would turn a stray Space or Enter into a skipped rest. Controls stay reachable with Tab once the user focuses the window. | test: `accessibility.test.tsx`; e2e: window not focused |

### 6.8 Testing

| ID | Rule | Enforcement |
| -- | ---- | ----------- |
| X1 | Every feature ships logic tests and UI/UX tests. A feature missing either is incomplete. | review |
| X2 | Test at the lowest layer that can express the behavior. Token math and generators run in Node. Components run in jsdom. Only flows that need the real app run in Playwright. | review |
| X3 | `*.test.tsx` starts with `// @vitest-environment jsdom`. Logic tests have no DOM. | convention |
| X4 | CSS cannot be verified in jsdom. Assert CSS text contracts with regular expressions on the stylesheet, and verify real appearance in the gallery (2.4). | review, see V12 |
| X5 | Cover edge cases: disabled, keyboard, both themes, reduced motion, forced colors. | review |

### 6.9 Process

| ID | Rule | Enforcement |
| -- | ---- | ----------- |
| P1 | One small, complete, tested step at a time. `npm run check` is green before the next step. | review |
| P2 | Format new code with Prettier in single-quote mode, then run `npm run lint`. | review |
| P3 | New dependency: state why, size, maintenance, and the no-dependency alternative first. | review |
| P4 | The GitHub repository is the source of truth. Fetch before building on it. | review |
| P5 | If a request conflicts with the product spec, state the conflict first. | review |

## 7. Recipe: build a new primitive

Follow this order. Do not skip the tests.

1. Decide the API: variants as string unions, no `className`, native element, `...props`
   passthrough.
2. List every token it needs. If one is missing, add the token in a separate earlier step.
3. Write the pure class-name function and export it from `src/renderer/ui/index.ts`.
4. Write the CSS using only `var(--er-*)`. Order: base, variants, sizes, hover in
   `@media (hover: hover)`, pressed, `:focus-visible`, disabled, reduced motion, forced colors.
5. Write the tests (section 8).
6. Run `npm run check`. `tests/design/component-css.test.ts` scans your CSS file automatically.
7. Add the component to `harness/gallery.tsx` with a `data-testid` per state, and a computed-style check in `e2e/gallery/` for anything jsdom cannot prove.

Skeleton:

```tsx
// src/renderer/ui/Thing.tsx
import type { ComponentPropsWithoutRef } from 'react';
import './Thing.css';

export type ThingVariant = 'a' | 'b';

export interface ThingProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'className'
> {
  readonly variant?: ThingVariant;
}

export function thingClassName(variant: ThingVariant): string {
  return ['er-thing', `er-thing--${variant}`].join(' ');
}

export function Thing({ variant = 'a', ...props }: ThingProps) {
  return <div {...props} className={thingClassName(variant)} />;
}
```

```css
/* src/renderer/ui/Thing.css */
.er-thing {
  border: var(--er-stroke-hairline) solid transparent;
  border-radius: var(--er-radius-md);
  color: var(--er-color-text-primary);
  background-color: var(--er-color-surface);
  box-shadow: var(--er-elevation-raised-sm);
}

@media (forced-colors: active) {
  .er-thing {
    border-color: CanvasText;
  }
}
```

## 8. Test patterns

For a component, write these. Copy from `tests/renderer/ui/button.test.tsx`.

- Class mapping: the pure function returns the exact classes for every variant and size.
- Render: default element, default variant, children, accessible name.
- Behavior: click fires once. Disabled does not fire and is skipped by Tab. Enter and Space work.
- Passthrough: `aria-*`, `id`, `data-*`, ref (where supported).
- CSS contract: read the `.css` file with `readFileSync`, assert the rules that matter with a
  regular expression (press scale token, focus ring, forced-colors border, reduced-motion block,
  disabled opacity, each variant uses its token).
- Token coverage: where a CSS rule corresponds to a token group (every elevation, every type
  role), loop over the token list from `src/design`. A new token then fails the test until the CSS
  handles it.

For tokens, test: schema (no missing or extra key in either theme), generator (each variable
declared once, exact values and units), contrast (every pair), and any invariant of the group
(sizes ascend, reduced values are neutral).

Concentric radius cannot be proven in jsdom. The values were checked once in Chromium by rendering
each combination and reading `getComputedStyle(button).borderTopLeftRadius`. With a 16px root:

| Parent | Child | Result |
| ------ | ----- | ------ |
| radius `md`, padding `xs` | Button | 7px (16 - 8 - 1) |
| radius `lg`, padding `sm` | Button | 11px (24 - 12 - 1) |
| radius `sm`, padding `xs` | Button | 0px (clamped) |
| radius `lg`, padding `md` | Button | 16px (reset, falls back to `radius-md`) |
| `lg`/`md` panel, then `md`/`xs` well | Button | 7px |
| `lg`/`xs` well, then `lg`/`md` panel | Button | 16px (inner panel resets) |

The gallery (2.4a) renders these cases and `primitives.gallery.ts` asserts the same numbers.

Scanners live in `tests/helpers/css-scan.ts`: `rawColorLiterals`, `rawPixelLengths`,
`usedVars`, `declaredVars`, `hoverOutsideHoverMedia`. Reuse them. Add a scanner there when a new
rule can be checked by text.

## 9. Motion recipes (use these values exactly)

Press feedback (already in `Button.css`):

```css
.thing {
  transition-property: scale, box-shadow, background-color;
  transition-duration: var(--er-duration-quick);
  transition-timing-function: var(--er-ease-out);
}

.thing:not(.thing--static):not(:disabled):active {
  scale: var(--er-motion-press-scale);
}

@media (prefers-reduced-motion: reduce) {
  .thing {
    transition-property: box-shadow, background-color;
  }
}
```

Entrance of a staged panel (to build in 2.3, no animation library needed). The hidden state lives
in the `from` keyframe so an element whose animation never runs stays visible. Reduced motion keeps
only the opacity keyframe.

```css
.chunk {
  animation: er-fade-in var(--er-duration-base) var(--er-ease-out) both;
}

@media (prefers-reduced-motion: no-preference) {
  .chunk {
    animation-name: er-fade-in-up;
  }
}

.chunk:nth-child(2) {
  animation-delay: var(--er-motion-stagger);
}

@keyframes er-fade-in {
  from {
    opacity: 0;
  }
}

@keyframes er-fade-in-up {
  from {
    opacity: 0;
    transform: translateY(var(--er-motion-enter-offset));
    filter: blur(var(--er-motion-blur));
  }
}
```

Keyframes are allowed here because an entrance runs once. State changes never use them (M1).

Exit: 150ms, ease-out, opacity plus `translateY(var(--er-motion-exit-offset))` plus blur. Where the
motion adds no information, remove the element at once.

Theme-switch suppression (M10). Build this when theme switching lands. The helper is renderer
code, not a token:

```ts
export function withTransitionsSuppressed(apply: () => void): void {
  const style = document.createElement('style');
  style.append(
    document.createTextNode('*,*::before,*::after{transition:none !important}'),
  );
  document.head.append(style);
  apply(); // set or remove data-theme here
  void document.body.offsetHeight; // force a synchronous style flush
  requestAnimationFrame(() => {
    requestAnimationFrame(() => style.remove());
  });
}
```

It also needs a listener on `matchMedia('(prefers-color-scheme: dark)')` for OS-level changes.
Note: CSP allows inline styles (`style-src 'unsafe-inline'`), so this works. This `!important` is
the one allowed exception to C11, because it is a temporary override.

Icon cross-fade (M9), with both icons in the DOM:

```css
.icon-layer {
  grid-area: 1 / 1;
  transition-property: opacity, filter, scale;
  transition-duration: var(--er-duration-base);
  transition-timing-function: var(--er-ease-standard);
}

.icon-layer[data-state='hidden'] {
  opacity: 0;
  scale: 0.25;
  filter: blur(var(--er-motion-blur));
}

@media (prefers-reduced-motion: reduce) {
  .icon-layer[data-state='hidden'] {
    scale: 1;
    filter: none;
  }
}
```

## 10. Platform rules

| Platform | Rule |
| -------- | ---- |
| Windows, macOS, Linux X11 (`positioned`) | The window is the panel. The panel fills it. |
| Linux Wayland (`surface`) | A transparent window covers the work area. CSS places the panel. Never set a page background. |
| All | Click-through during the warning, interactive during the rest. This is main-process behavior. Do not simulate it in CSS. |
| All | Dim layer is a separate window below the overlay window. z-index tokens apply inside one window only. |
| Windows high contrast, macOS increased contrast | `forced-colors: active` must show an edge on every control (C12). |

Cross-platform checks for every visual feature: Windows, macOS, Linux X11, Linux Wayland. State
the behavior for each in the step report.

## 11. Definition of done for a design step

- Implementation uses tokens only.
- Logic tests and UI tests exist (X1).
- `npm run check` passes. Run `npm run e2e` when main, preload or overlay code changed.
- Both themes looked at. Reduced motion and forced colors considered.
- Report lists files added, changed, deleted, new dependencies, and tests with what each covers.
- This document is updated: status table, rules, violations register.

## 12. Roadmap of remaining design work

Each item is one step. Do them in order.

| Step | Scope | Done when |
| ---- | ----- | --------- |
| 2.1b-2 | Add `Manrope-Variable.woff2` and `OFL.txt` to `src/renderer/assets/fonts/` (steps in that folder's README). No code change. | `document.fonts.check("1rem 'Manrope Variable'")` is true in the running app, and `tests/renderer/font-assets.test.ts` passes |
| 2.2c | `Countdown` (display role, `role="timer"`, tabular numerals) and `ProgressRing` (SVG, `--er-motion` transition on stroke offset, clamps 0 to 100 percent, linear ticking per second) | Done. Component tests, CSS contract tests, ring clamp tests |
| 2.2d | `Icon` and a small set (skip, postpone, eye, moon, sun). Hand-drawn SVG paths, `currentColor`, non-scaling stroke. No icon dependency. | Done. I1 to I6 tests, accessible names |
| 2.2e | Optical-alignment padding on `Button` with an icon (S5), `--er-color-image-outline` token and `Photo` (S4) | Done. Token, CSS contract and component tests |
| 2.3a | Overlay components built from primitives, copy stays in `copy.ts` | Done. Overlay tests unchanged in behavior, no inline styles in `components/`. `ProgressRing` is not used: the view model has no total duration, so a percent cannot be computed (roadmap candidate: `totalSeconds` in the snapshot) |
| 2.3b | Entrance motion (M7) with CSS keyframes; exit (M8) moves to V15 | Done. Chunk, CSS contract and e2e computed-style tests; reduced motion verified through the tokens |
| 2.3c | Theme mechanism in the renderer (`system`, `light`, `dark`; `data-theme`; OS-change listener; suppression helper M10). The setting itself (persistence in main, IPC, UI entry) is split out as 2.3c-2 | Done. Logic, DOM adapter and e2e tests |
| 2.3c-2 | Theme setting (store in main, validated IPC channel, entry point) | Moved to ROADMAP candidate 4.13. Phase 2 is the design system, and a setting is a feature |
| 2.3d | Accessibility pass: milestone announcements (A2). "Focus when the rest begins" is rejected: focus stays where it is (A6) | Done. Logic, component and e2e tests |
| 2.4a | Gallery page in the harness (every primitive, every state, both themes) and computed-style checks in plain Chromium | Done. `e2e/gallery/*.gallery.ts`, linked from `RUNNING.md`, runs in CI on Linux |
| 2.4b | Screenshot baselines of the gallery (`toHaveScreenshot`), Linux only | Dropped by decision: no screenshots of the app in the repository until the software is finished. Reopen at the end |
| 3.1 | Overlay panels already use the primitives (2.3a). Make the positioned overlay window transparent (V4). The raw dim color (V2, V3) moves with the dim layer to 3.2. | Rounded panel corners show no window color. Page painted by no stylesheet. Windows and Linux X11 checked by the owner |
| 3.2a | Dim layer from the `scrim` token (V2, V3) | `scrim` token is the only dim color. No raw color in renderer TS or TSX |
| 3.2b | Tray icon set, app icon, installer artwork | Every icon file exists and the builder config references it |
| 3.3 | Polish pass, run the `better-ui` Before-you-finish table across the codebase | Violations register empty |

Anything outside this list is a Phase 4 candidate. Record it in `docs/ROADMAP.md`.

## 13. Decisions log

| Decision | Outcome | Where |
| -------- | ------- | ----- |
| Manrope delivery | Committed woff2 file and a small loader, no dependency. The loader (`src/renderer/fonts.ts`) registers each file listed in `src/design/fonts.ts` through the `FontFace` API. Vite finds files with `import.meta.glob`, so a missing file never breaks the build. The file itself is still to be added (2.1b-2). | `src/renderer/fonts*.ts`, `src/renderer/assets/fonts/README.md` |
| Concentric nesting | Tight surfaces publish an inner radius that controls read. See S1 and S2. | `Surface.css`, `Button.css` |
| Positioned window background | Transparent in both layouts (step 3.1). The panel is a rounded `Surface`, so an opaque window would show window-colored corners. No OS-theme sync is needed any more. | `src/main/overlay/window-background.ts` |

Why the font is a file and not `@fontsource-variable/manrope`: the app must work offline and a
desktop bundle gains nothing from a package manager for one font. Why a `FontFace` loader and not a
CSS `@font-face`: the generated stylesheet is a virtual module, where relative `url()` paths do not
resolve, and a loader tolerates a missing file.

Why the window is transparent (step 3.1): the panel is a rounded, themed `Surface`, so an opaque
window shows window-colored corners. Risk: transparent frameless windows behave differently on
Windows, Linux X11 without a compositor, and macOS. On X11 without a compositor the transparent
area renders opaque black. This was not verified on hardware; it is in the owner's Phase 3.1 review.

## 14. Violations register

Severity follows the `better-ui` scale. HIGH breaks an interaction. MEDIUM is a visible
inconsistency or a broken invariant. LOW is isolated polish or a latent risk. Locations were read
from the repository at the time of writing. Nothing here was verified in a running app, so every
visual claim is from code only.

### 14.1 Violations

| ID | Severity | Rule | Location | Problem | Fix |
| -- | -------- | ---- | -------- | ------- | --- |
| V7 | LOW | A4 | `src/renderer/ui/Button.css:44-50` | `md` button is about 43.5px tall, `sm` about 35.5px (label line height plus padding plus the 1px borders). Under the 44px target. Passes the WCAG 2.2 minimum of 24px. | Add a `min-height` token at 2.75rem for `md` if the overlay needs touch use. |
| V8 | LOW | F2, S3 | `src/design/tokens.ts` (`border-strong`) | `border-strong` has a 3:1 pair but no component uses it. `secondary` and `quiet` buttons show their edge by shadow or text only. Safe while there are no inputs. | First input or toggle must use `border-strong`. |
| V10 | LOW | API | `src/renderer/ui/Text.tsx:21` | Props come from `<p>`. With `as="label"`, TypeScript rejects `htmlFor`. `Surface` has no `ref`. | Add a polymorphic prop type when a label or ref is first needed. |
| V15 | LOW | M8 | `src/main/overlay/overlay-window-manager.ts:141` | No exit animation. `hide()` runs on the same snapshot that leaves the rest phase, so a renderer exit would be cut off. For Skip and Postpone, instant removal is right ("motion adds no information", and the e2e asserts everything goes away at once). Only the natural end of a rest could use a 150ms exit. | Candidate step: main defers `hide()` by `--er-duration-quick` on a natural end only, the renderer holds the last view model and plays the exit. Cross-process change: needs its own justification and tests. |
| V14 | LOW | Process | `docs/ROADMAP.md` | The status board said 2.1 was in progress and 2.2 was TODO. | Updated in this step. Keep it current at each step. |

### 14.1a Resolved

| ID | Was | Fixed by |
| -- | --- | -------- |
| V1 | A `Button` in a padded `Surface` was not concentric. | S1 clarified (applies to children that fill the content box). `Surface` `xs` and `sm` publish `--er-surface-inner-radius`, `Button` reads it. Verified in Chromium. |
| V2, V3 | Dim color `rgba(32, 32, 32, 0.6)` and an inline `rgba()` in `App.tsx`, disagreeing with the `scrim` token. | Step 3.2a: `DIM_COLOR` is `resolveToken(themes.light.scrim)`, the integrated scrim is `.er-integrated-dim` reading `--er-color-scrim`. Visible change: the dim is now black at 40%. |
| V4 | Positioned overlay window was opaque, so rounded corners showed window color. | Step 3.1: transparent window. Owner check on Windows and Linux X11 pending. |
| V11 | S4 needed `oklch()`, which C4 bans in component CSS. | `--er-color-image-outline` token (black or white at 10%) consumed by `Photo.css`. |
| V12 | Duplicate test files in `src/design/`. | Deleted. |
| V13 | The Manrope file was missing. | `Manrope-Variable.woff2` and `OFL.txt` added to `src/renderer/assets/fonts/`. |
| V5 | `Button` transitions smeared on a theme change. | `createTransitionSuppressor` wraps every theme change and OS flip. |
| V6 | jsdom tests only matched CSS text. | `e2e/gallery/primitives.gallery.ts` reads computed styles for the focus ring, press scale, radii, padding, outlines, forced colors and reduced motion. |
| V9 | The token pairs ignored the 1px border. | The pairs were deleted. The CSS `calc()` subtracts `--er-stroke-hairline`, so the border is exact. |

### 14.2 Intentional deviations from `better-ui`

The skill says a deliberate, consistent project convention is a preference, not a finding. These
are deliberate. They must stay consistent, and any new code follows them.

| Topic | Skill default | Our convention | Why |
| ----- | ------------- | -------------- | --- |
| Elevation | Three-layer ring shadow, in dark mode a single white ring | Two-layer neumorphic pair in both themes | Neumorphism needs a light and a dark shadow in both themes |
| Dark canvas | Not specified | `neutral-850`, not black | A dark shadow needs a lighter canvas |
| Enter and exit easing | `ease-out` | `ease-out` (`--er-ease-out`) | Same. `--er-ease-standard` is for the icon swap only |
| Reduced motion | Wrap in a media query per component | Effect tokens go neutral globally, plus a media query where a transition names `scale` | One mechanism, fewer mistakes |
| Skill dependencies | Refers to `better-typography`, `better-accessibility`, `better-layout`, `better-colors` | Those skills are not in the repo, so their rules are summarized in sections 4 and 6 | Nothing else available |

### 14.3 Not verified

These were never run in an application, so treat them as unproven.

- Real appearance of any component, as a picture. The gallery (2.4a) proves computed styles in
  Chromium (`npm run e2e:gallery`, in CI), but nothing compares pixels, by decision. Judge looks by
  eye in `npm run dev:renderer` and `/gallery.html`.
- RTL mirroring of the icons in a browser (unit-tested only).
- The virtual CSS module under `npm run build` on Windows and macOS.
- Dark-theme legibility over the real dim layer.
- Font loading in the packaged app: the `?url` asset path under `file://` and the CSP. Check with
  `document.fonts.check` after adding the file (section 12, step 2.1b-2).
- The themed overlay window background on each OS, and the `nativeTheme` update handler.

## 15. Quick reference

Do:

- Add values in `src/design`, then use `var(--er-*)`.
- Use semantic color tokens, native elements, typed variant props.
- Add a test for every rule your CSS touches, and loop over token lists.
- Keep `border: ... solid transparent` under shadows.
- Gate hover behind `(hover: hover)`, focus behind `:focus-visible`.

Do not:

- Write a hex, rgb, oklch or px value in component CSS.
- Use `transition: all`, `will-change: all` or `!important` (except the theme-switch helper).
- Declare theme-dependent variables on a bare `:root`.
- Animate with keyframes for hover, press or toggles.
- Set a global background in the generated sheet.
- Add a hue, a tinted neutral or a remote asset.
- Skip the contrast pair for a new color combination.

Commands: `npm run check`, `npm run lint`, `npm test`, `npm run dev:renderer`, `npm run e2e`,
`npm run e2e:gallery`.
