// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '../../src/core/scheduler';
import { Overlay } from '../../src/renderer/components/Overlay';
import { toOverlayViewModel } from '../../src/renderer/view-model';

const working: Snapshot = {
  state: { phase: 'working', restAt: 1_200_000, restsDone: 0 },
  secondsRemaining: null,
};

const warning = (seconds: number): Snapshot => ({
  state: { phase: 'warning', restAt: 1_200_000, restsDone: 0 },
  secondsRemaining: seconds,
});

const resting = (kind: 'eye' | 'long', seconds: number): Snapshot => ({
  state: { phase: 'resting', kind, endsAt: 1_220_000, restsDone: kind === 'long' ? 2 : 0 },
  secondsRemaining: seconds,
});

function setup(initial: Snapshot) {
  const handlers = { onSkip: vi.fn(), onPostpone: vi.fn() };
  const view = render(<Overlay viewModel={toOverlayViewModel(initial)} {...handlers} />);
  return {
    handlers,
    show(next: Snapshot) {
      view.rerender(<Overlay viewModel={toOverlayViewModel(next)} {...handlers} />);
    },
  };
}

const status = () => screen.getByRole('status');

describe('milestone announcements (A2)', () => {
  it('exposes a polite status region, hidden visually and present in the accessibility tree', () => {
    setup(warning(15));
    expect(status()).toHaveClass('er-visually-hidden');
    expect(status()).not.toHaveAttribute('aria-hidden');
  });

  it('announces the warning when it appears', () => {
    setup(warning(15));
    expect(status()).toHaveTextContent('Eye rest starts in 15 seconds.');
  });

  it('stays quiet while the warning counts down', () => {
    const { show } = setup(warning(15));
    show(warning(14));
    show(warning(13));
    expect(status()).toHaveTextContent('Eye rest starts in 15 seconds.');
  });

  it('announces the rest when it starts, keeping the same live region', () => {
    const { show } = setup(warning(1));
    const region = status();

    show(resting('eye', 20));

    expect(status()).toBe(region);
    expect(status()).toHaveTextContent('Rest your eyes for 20 seconds.');
  });

  it('announces the long rest milestones, and only those', () => {
    const { show } = setup(resting('long', 600));
    expect(status()).toHaveTextContent('Take a longer break for 10 minutes.');

    show(resting('long', 599));
    show(resting('long', 61));
    expect(status()).toHaveTextContent('Take a longer break for 10 minutes.');

    show(resting('long', 60));
    expect(status()).toHaveTextContent('1 minute left.');

    show(resting('long', 11));
    expect(status()).toHaveTextContent('1 minute left.');

    show(resting('long', 10));
    expect(status()).toHaveTextContent('10 seconds left.');
  });

  it('has no live region once the overlay is hidden, and announces the next rest afresh', () => {
    const { show } = setup(resting('eye', 20));
    show(working);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    show(resting('eye', 20));
    expect(status()).toHaveTextContent('Rest your eyes for 20 seconds.');
  });

  it('keeps the timer free of live-region semantics, so it is not read every second', () => {
    setup(resting('eye', 20));
    const timer = screen.getByRole('timer');
    expect(timer).not.toHaveAttribute('aria-live');
    expect(timer.closest('[aria-live]')).toBeNull();
    expect(timer.closest('[role="status"]')).toBeNull();
  });
});

describe('focus', () => {
  it('moves no focus when a rest appears, so a stray key cannot skip it', async () => {
    const { handlers, show } = setup(warning(1));
    show(resting('eye', 20));

    expect(document.body).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(handlers.onSkip).not.toHaveBeenCalled();
    expect(handlers.onPostpone).not.toHaveBeenCalled();
  });

  it('is still fully keyboard reachable: Tab lands on Skip, then Postpone', async () => {
    setup(resting('eye', 20));
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Skip' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Postpone' })).toHaveFocus();
  });

  it('keeps the status region out of the Tab order', async () => {
    setup(warning(15));
    await userEvent.tab();
    expect(document.body).toHaveFocus();
  });
});

describe('labelled structure', () => {
  it('names the region after its title and keeps one h2', () => {
    setup(resting('eye', 20));
    expect(screen.getByRole('region', { name: 'Rest your eyes' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });
});
