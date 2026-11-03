# eyerest V2 design

Status: DRAFT for owner decision. No V2 code exists. Nothing here changes behavior until the open
questions in `09-decisions.md` are answered and the owner approves the plan in `10-plan.md`.

V2 replaces the V1 visual direction (soft neumorphism, achromatic, `docs/design-system.md`) with a
soft, flat, Apple-like system: dark and light themes, one blue accent, hairline edges instead of
paired shadows, spring motion. Product behavior (`docs/ROADMAP.md` section 2) is unchanged except
where `03-rest-modes.md` and `09-decisions.md` state a conflict.

## Documents

| File | Covers |
| ---- | ------ |
| `00-principles.md` | Direction, what changes from V1, anti-"AI slop" guardrails, review checklist |
| `01-foundations.md` | Palette, semantic color tokens, type, space, radius, elevation, materials, contrast |
| `02-theming.md` | Item 1: light and dark theme, system follow, override, switching, platform notes |
| `03-rest-modes.md` | Item 2: eye exercise and rest in component mode and full-screen mode |
| `04-settings.md` | Item 3: settings window redesign |
| `05-stats.md` | Item 4: statistics redesign |
| `06-icons.md` | Item 5: icon redesign |
| `07-inputs-forms.md` | Item 6: inputs and forms redesign |
| `08-motion.md` | Item 7: motion redesign |
| `09-decisions.md` | Decision log (recommendation, alternative, why it loses) and open questions |
| `10-plan.md` | Code-phase steps, tests per step, platform matrix, roadmap candidates |

## Design source

Figma file `eyerest`, fileKey `QhwsfG1rwrMcj1iakRnATq`
(https://www.figma.com/design/QhwsfG1rwrMcj1iakRnATq/eyerest). The file has the three pages the
free plan allows. No images are committed to this repository (project rule: no screenshots until
the software is finished). Docs reference Figma nodes instead.

| Page | Node | Content |
| ---- | ---- | ------- |
| Foundations | `0:1`, board `7:2` | Color, type, spacing, radius, elevation, motion tokens |
| Components | `5:24`, board `8:2` | Button `8:25`, CountdownRing `8:38`, WarningToast `8:41`, RestCard `8:86` |
| Screens | `5:25` | `16:19` Warning, `16:47` Eye rest (dimmed), `16:84` Long rest |

Figma variables: collection `Color` (dark), collection `Color Light` (light, identical token names;
the free plan allows one mode per collection), plus Spacing, Radius and Motion. Code syntax is
`var(--surface-base)` style in Figma and `--er-color-surface-base` in the repository (prefix kept).

Not yet in Figma: full-screen rest, settings, stats, icon sheet, form controls, Light screens.
Screens page `5:25` was not visually verified (Figma MCP rate limit). Those designs are specified
in these documents and get built in Figma when the limit resets, before the code step that uses
them.

## Reading order

`00`, `01`, `09`, then the item you are deciding on.
