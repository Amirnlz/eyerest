// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '../../src/core/scheduler';
import { Overlay } from '../../src/renderer/components/Overlay';
import { copy } from '../../src/renderer/copy';
import { toOverlayViewModel } from '../../src/renderer/view-model';

const idle: Snapshot = { state: { phase: 'idle' }, secondsRemaining: null };

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

function renderSnapshot(snapshot: Snapshot, handlers = { onSkip: vi.fn(), onPostpone: vi.fn() }) {
  const view = render(<Overlay viewModel={toOverlayViewModel(snapshot)} {...handlers} />);
  return {
    ...view,
    handlers,
    update(next: Snapshot) {
      view.rerender(<Overlay viewModel={toOverlayViewModel(next)} {...handlers} />);
    },
  };
}

describe('Overlay', () => {
  it.each([
    ['idle', idle],
    ['working', working],
  ])('renders nothing when %s', (_name, snapshot) => {
    const { container } = renderSnapshot(snapshot);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the warning with a countdown and no buttons', () => {
    renderSnapshot(warning(15));
    expect(screen.getByRole('heading', { name: copy.warning.title })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('15');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows an eye rest with both buttons', () => {
    renderSnapshot(resting('eye', 20));
    expect(screen.getByRole('heading', { name: copy.rest.eye.title })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('20');
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Postpone' })).toBeInTheDocument();
  });

  it('shows the long rest text and a m:ss countdown', () => {
    renderSnapshot(resting('long', 600));
    expect(screen.getByRole('heading', { name: copy.rest.long.title })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('10:00');
  });

  it('routes Skip and Postpone clicks to the matching callbacks', async () => {
    const user = userEvent.setup();
    const { handlers } = renderSnapshot(resting('eye', 20));

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(handlers.onSkip).toHaveBeenCalledTimes(1);
    expect(handlers.onPostpone).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Postpone' }));
    expect(handlers.onPostpone).toHaveBeenCalledTimes(1);
    expect(handlers.onSkip).toHaveBeenCalledTimes(1);
  });

  it('follows the full cycle as snapshots change', () => {
    const { container, update } = renderSnapshot(working);
    expect(container).toBeEmptyDOMElement();

    update(warning(15));
    expect(screen.getByRole('timer')).toHaveTextContent('15');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    update(warning(14));
    expect(screen.getByRole('timer')).toHaveTextContent('14');

    update(resting('eye', 20));
    expect(screen.getByRole('timer')).toHaveTextContent('20');
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();

    update(resting('eye', 19));
    expect(screen.getByRole('timer')).toHaveTextContent('19');

    update(working);
    expect(container).toBeEmptyDOMElement();
  });

  it('removes the buttons as soon as the rest ends', () => {
    const { update } = renderSnapshot(resting('eye', 1));
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();

    update(working);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
