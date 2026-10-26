// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RestPanel } from '../../src/renderer/components/RestPanel';
import { WarningNotice } from '../../src/renderer/components/WarningNotice';
import type { RestViewModel, WarningViewModel } from '../../src/renderer/view-model';

const warningVm: WarningViewModel = {
  mode: 'warning',
  title: 'Eye rest starting soon',
  message: 'Finish what you are doing.',
  seconds: 15,
  countdown: '15',
};

const restVm: RestViewModel = {
  mode: 'rest',
  kind: 'eye',
  title: 'Rest your eyes',
  message: 'Look away from the screen.',
  seconds: 20,
  countdown: '20',
  skipLabel: 'Skip',
  postponeLabel: 'Postpone',
};

describe('WarningNotice', () => {
  it('shows title, message and countdown', () => {
    render(<WarningNotice viewModel={warningVm} />);
    expect(screen.getByRole('heading', { name: warningVm.title })).toBeInTheDocument();
    expect(screen.getByText(warningVm.message)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('15');
  });

  it('is a labelled region named after its title', () => {
    render(<WarningNotice viewModel={warningVm} />);
    expect(screen.getByRole('region', { name: warningVm.title })).toBeInTheDocument();
  });

  it('has no buttons', () => {
    render(<WarningNotice viewModel={warningVm} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('updates the countdown when props change', () => {
    const { rerender } = render(<WarningNotice viewModel={warningVm} />);
    rerender(<WarningNotice viewModel={{ ...warningVm, seconds: 14, countdown: '14' }} />);
    expect(screen.getByRole('timer')).toHaveTextContent('14');
  });
});

describe('RestPanel', () => {
  it('shows title, message and countdown', () => {
    render(<RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />);
    expect(screen.getByRole('heading', { name: restVm.title })).toBeInTheDocument();
    expect(screen.getByText(restVm.message)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('20');
  });

  it('shows both action buttons with the labels from the view model', () => {
    render(<RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Skip' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Postpone' })).toBeEnabled();
  });

  it('calls onSkip once when Skip is clicked, and nothing else', async () => {
    const onSkip = vi.fn();
    const onPostpone = vi.fn();
    const user = userEvent.setup();
    render(<RestPanel viewModel={restVm} onSkip={onSkip} onPostpone={onPostpone} />);

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onPostpone).not.toHaveBeenCalled();
  });

  it('calls onPostpone once when Postpone is clicked, and nothing else', async () => {
    const onSkip = vi.fn();
    const onPostpone = vi.fn();
    const user = userEvent.setup();
    render(<RestPanel viewModel={restVm} onSkip={onSkip} onPostpone={onPostpone} />);

    await user.click(screen.getByRole('button', { name: 'Postpone' }));

    expect(onPostpone).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('can be operated with the keyboard', async () => {
    const onSkip = vi.fn();
    const onPostpone = vi.fn();
    const user = userEvent.setup();
    render(<RestPanel viewModel={restVm} onSkip={onSkip} onPostpone={onPostpone} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Skip' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSkip).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Postpone' })).toHaveFocus();
    await user.keyboard(' ');
    expect(onPostpone).toHaveBeenCalledTimes(1);
  });

  it('updates the countdown when props change', () => {
    const { rerender } = render(
      <RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />,
    );
    rerender(
      <RestPanel
        viewModel={{ ...restVm, seconds: 19, countdown: '19' }}
        onSkip={vi.fn()}
        onPostpone={vi.fn()}
      />,
    );
    expect(screen.getByRole('timer')).toHaveTextContent('19');
  });
});
