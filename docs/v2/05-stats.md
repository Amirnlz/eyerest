# 05 Statistics

Item 4. Today: a table of the last 7 days (taken, skipped, postponed per day, plus a total row)
inside the settings page (`StatsPanel`). Data is local only, newest day first (`core/stats`).

## Principles

The data answers one question: did I rest this week. It does not rank, score or praise (G10).
No streaks, no goals, no percent-of-target, no comparison to a previous period. Skipped is shown
without judgment colors.

## Structure (pane "Activity")

```text
  Activity

  Today                          Last 7 days
  4 taken                        23 taken   3 skipped   2 postponed

  ┌ chart ─────────────────────────────────────────────┐
  │        ▇                                           │
  │  ▇     ▇     ▇  ▇     ▇                            │   stacked bars, one per day, oldest left
  │  ▇  ▇  ▇  ▇  ▇  ▇  ▇  ▇                            │
  │  Mon Tue Wed Thu Fri Sat Sun                       │
  └────────────────────────────────────────────────────┘
  ■ Taken   ▨ Skipped   □ Postponed        [ Show as table ]

  Kept on this computer only.
```

| Element | Spec |
| ------- | ---- |
| Summary | Two blocks. Left: today's taken count (`display` role, tabular). Right: week totals as three inline numbers with labels (`label` role) |
| Chart | One stacked bar per day, seven bars, oldest to newest left to right (reading order; the data arrives newest first and the renderer reverses it for the chart only) |
| Bar fill | Taken `accent-progress`. Skipped `text-secondary` at 40% with a diagonal hatch. Postponed outline only, 1.5 px `text-secondary`, no fill |
| Why not three hues | The palette has one accent. Two non-accent series differ by pattern and fill, so the chart reads without color and in forced-colors (G9, G15) |
| Bar shape | Radius `sm` on the top segment only, 24 wide, 8 gap. Heights scale to the week's max, minimum visible height 4 for a nonzero value |
| Axis | Weekday short labels in `caption`. No y axis, no gridlines. Value labels appear on hover and focus, and the max day is labeled |
| Today | Today's bar has an `accent-progress` 2 px underline marker. Label reads "Today" |
| Legend | Inline under the chart, glyph plus word, same patterns as the bars |
| Table | "Show as table" toggles the existing semantic `<table>`. The table is always in the DOM for screen readers and visually hidden while the chart shows. It is the accessible source of truth |
| Empty | No bars. Text: "No rests recorded yet." Axis labels still shown |
| Error | "Could not load statistics." No chart |
| Note | "Kept on this computer only." plus the existing explanation of Skipped and Postponed, as a `caption` |

## Not in V2

Longer ranges, clear stats, tray line for today, live refresh: already candidates in roadmap 4.9.
They stay candidates. V2 only changes presentation of the existing 7-day data.

## Motion

Bars grow from the baseline once, when the pane first appears: 320 ms spring, 30 ms stagger left
to right. Not on re-render, not on data refresh. Reduced motion: no growth, bars appear.
Hover or focus on a bar: value label fades in 120 ms.

## Accessibility

| Item | Spec |
| ---- | ---- |
| Chart | `role="img"` with an `aria-label` summarizing the week ("23 rests taken, 3 skipped, 2 postponed in the last 7 days"), plus the table as detail |
| Bars | Focusable from the table toggle; not individually tabbable (7 stops add noise). Hover values duplicate table cells |
| Pattern | Bars never depend on color alone (hatch, outline) |
| Contrast | Bar to panel 3:1 for every series in both themes (asserted) |

## Data and contract

No change. The renderer reverses the array for display and computes nothing beyond sums and
heights (`stats-model.ts` extended with `barHeights(days, maxPx)`, pure and tested). Counting rules
are unchanged and stay in `core`.

## Tests

| Layer | Test |
| ----- | ---- |
| Logic | `barHeights`: max day gets full height, zero stays zero, tiny nonzero gets minimum 4, all zero, one day. Order reversal. Summaries and label text |
| jsdom | Chart renders seven bars; table stays in the DOM; toggle switches visible view and updates `aria-pressed`; empty and error states; today marker; label text; no animation under reduced motion |
| Gallery | Chart in light, dark, forced-colors: each series distinguishable without color; contrast asserted; no overflow at min window width |
| e2e | Existing `stats.e2e.ts`: data after a skip and a postpone appears in the Activity pane as expected values in the table |

## Platform behavior

Renderer only. Identical on Windows, macOS, Linux X11 and Wayland. Dates format with the viewer's
locale (`Intl.DateTimeFormat`); RTL mirrors bar order (newest at the left).
