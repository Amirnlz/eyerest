import { useId } from 'react';
import type { DailyStats } from '../../core/stats';
import { copy } from '../copy';
import { dayLabel, totalsOf } from '../stats/stats-model';
import { Text } from '../ui';
import './StatsPanel.css';

export interface StatsPanelProps {
  /** Newest first, today first. Null when the statistics could not be loaded. */
  readonly days: readonly DailyStats[] | null;
}

/**
 * Read-only table of the last days' rests: taken, skipped, postponed. A real `<table>` with row and
 * column headers, so a screen reader announces each number with its day and column.
 */
export function StatsPanel({ days }: StatsPanelProps) {
  const titleId = useId();

  if (days === null) {
    return (
      <section className="er-stats-panel" aria-labelledby={titleId}>
        <Text as="h2" variant="title" id={titleId}>
          {copy.stats.title}
        </Text>
        <Text variant="body" tone="secondary">
          {copy.stats.loadFailed}
        </Text>
      </section>
    );
  }

  const totals = totalsOf(days);
  const empty = totals.taken + totals.skipped + totals.postponed === 0;

  return (
    <section className="er-stats-panel" aria-labelledby={titleId}>
      <Text as="h2" variant="title" id={titleId}>
        {copy.stats.title}
      </Text>
      <Text variant="body" tone="secondary">
        {copy.stats.note}
      </Text>
      <table className="er-stats-panel__table" aria-labelledby={titleId}>
        <thead>
          <tr>
            <th scope="col">{copy.stats.columns.day}</th>
            <th scope="col">{copy.stats.columns.taken}</th>
            <th scope="col">{copy.stats.columns.skipped}</th>
            <th scope="col">{copy.stats.columns.postponed}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, index) => (
            <tr key={day.date}>
              <th scope="row">{dayLabel(day, index)}</th>
              <td>{day.taken}</td>
              <td>{day.skipped}</td>
              <td>{day.postponed}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{copy.stats.total}</th>
            <td>{totals.taken}</td>
            <td>{totals.skipped}</td>
            <td>{totals.postponed}</td>
          </tr>
        </tfoot>
      </table>
      {empty ? (
        <Text variant="body" tone="secondary">
          {copy.stats.empty}
        </Text>
      ) : null}
    </section>
  );
}
