// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DailyStats } from '../../src/core/stats';
import { StatsPanel } from '../../src/renderer/components/StatsPanel';
import { copy } from '../../src/renderer/copy';

const days: DailyStats[] = [
  { date: '2026-11-02', taken: 3, skipped: 1, postponed: 0 },
  { date: '2026-11-01', taken: 2, skipped: 0, postponed: 4 },
  { date: '2026-10-31', taken: 0, skipped: 0, postponed: 0 },
];

describe('StatsPanel', () => {
  it('is a labelled section with a heading and the privacy note', () => {
    render(<StatsPanel days={days} />);
    expect(screen.getByRole('region', { name: copy.stats.title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: copy.stats.title })).toBeInTheDocument();
    expect(screen.getByText(copy.stats.note)).toBeInTheDocument();
  });

  it('is a table named by the heading, with the four column headers', () => {
    render(<StatsPanel days={days} />);
    const table = screen.getByRole('table', { name: copy.stats.title });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual([
      copy.stats.columns.day,
      copy.stats.columns.taken,
      copy.stats.columns.skipped,
      copy.stats.columns.postponed,
    ]);
  });

  it('shows one row per day, newest first, with today and yesterday named', () => {
    render(<StatsPanel days={days} />);
    const rows = screen.getAllByRole('row').slice(1); // without the header row
    const labels = rows.map((row) => within(row).getAllByRole('rowheader')[0]?.textContent);
    expect(labels.slice(0, 2)).toEqual([copy.stats.today, copy.stats.yesterday]);
    expect(rows).toHaveLength(days.length + 1); // days and the total row
  });

  it('gives every number its row and column, so a screen reader can announce them', () => {
    render(<StatsPanel days={days} />);
    const today = screen.getByRole('row', { name: new RegExp(copy.stats.today) });
    expect(within(today).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '3',
      '1',
      '0',
    ]);
  });

  it('adds a total row that sums the columns', () => {
    render(<StatsPanel days={days} />);
    const total = screen.getByRole('row', { name: new RegExp(copy.stats.total) });
    expect(within(total).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '5',
      '1',
      '4',
    ]);
  });

  it('says so when nothing is recorded, and not otherwise', () => {
    const view = render(<StatsPanel days={days} />);
    expect(screen.queryByText(copy.stats.empty)).toBeNull();
    view.unmount();

    render(<StatsPanel days={days.map((day) => ({ ...day, taken: 0, skipped: 0, postponed: 0 }))} />);
    expect(screen.getByText(copy.stats.empty)).toBeInTheDocument();
  });

  it('shows a message and no table when the statistics could not be loaded', () => {
    render(<StatsPanel days={null} />);
    expect(screen.getByText(copy.stats.loadFailed)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: copy.stats.title })).toBeInTheDocument();
  });

  it('has no interactive control, so it adds nothing to the keyboard order', () => {
    render(<StatsPanel days={days} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
