// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/renderer/App';
import { Overlay } from '../../src/renderer/components/Overlay';
import { RestPanel } from '../../src/renderer/components/RestPanel';
import { copy } from '../../src/renderer/copy';
import { toOverlayViewModel, type RestViewModel } from '../../src/renderer/view-model';
import { createFakeApi, resting, warning } from '../helpers/fake-api';

const vm = toOverlayViewModel(resting(20)) as RestViewModel;
const both = { skip: 'Ctrl+Alt+Shift+S', postpone: 'Ctrl+Alt+Shift+P' };

const skip = () => screen.getByRole('button', { name: 'Skip' });
const postpone = () => screen.getByRole('button', { name: 'Postpone' });

describe('RestPanel shortcut hints', () => {
  it('offers each registered shortcut as a tooltip and as a description read with the button', () => {
    render(<RestPanel viewModel={vm} onSkip={vi.fn()} onPostpone={vi.fn()} shortcuts={both} />);

    expect(skip()).toHaveAttribute('title', copy.actions.shortcut(both.skip));
    expect(skip()).toHaveAccessibleDescription(copy.actions.shortcut(both.skip));
    expect(postpone()).toHaveAttribute('title', copy.actions.shortcut(both.postpone));
    expect(postpone()).toHaveAccessibleDescription(copy.actions.shortcut(both.postpone));
  });

  it('leaves the accessible name of each button as its label', () => {
    render(<RestPanel viewModel={vm} onSkip={vi.fn()} onPostpone={vi.fn()} shortcuts={both} />);
    expect(skip()).toHaveAccessibleName('Skip');
    expect(postpone()).toHaveAccessibleName('Postpone');
  });

  it('shows nothing for an action with no registered shortcut', () => {
    render(
      <RestPanel
        viewModel={vm}
        onSkip={vi.fn()}
        onPostpone={vi.fn()}
        shortcuts={{ skip: null, postpone: both.postpone }}
      />,
    );
    expect(skip()).not.toHaveAttribute('title');
    expect(skip()).not.toHaveAttribute('aria-describedby');
    expect(skip()).toHaveAccessibleDescription('');
    expect(postpone()).toHaveAttribute('title', copy.actions.shortcut(both.postpone));
  });

  it('is unchanged without any hints', () => {
    render(<RestPanel viewModel={vm} onSkip={vi.fn()} onPostpone={vi.fn()} />);
    for (const button of [skip(), postpone()]) {
      expect(button).not.toHaveAttribute('title');
      expect(button).not.toHaveAttribute('aria-describedby');
    }
    expect(screen.queryByText(/Shortcut:/)).toBeNull();
  });

  it('adds no visible text: the hint is for assistive technology and the tooltip only', () => {
    render(<RestPanel viewModel={vm} onSkip={vi.fn()} onPostpone={vi.fn()} shortcuts={both} />);
    const hint = screen.getByText(copy.actions.shortcut(both.skip));
    expect(hint).toHaveClass('er-visually-hidden');
  });

  it('keeps the click behavior, and the tab order is still Skip then Postpone', async () => {
    const onSkip = vi.fn();
    const onPostpone = vi.fn();
    render(<RestPanel viewModel={vm} onSkip={onSkip} onPostpone={onPostpone} shortcuts={both} />);
    const user = userEvent.setup();

    await user.tab();
    expect(skip()).toHaveFocus();
    await user.tab();
    expect(postpone()).toHaveFocus();

    await user.click(skip());
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onPostpone).not.toHaveBeenCalled();
  });
});

describe('Overlay shortcut hints', () => {
  it('passes the hints to the rest panel', () => {
    render(<Overlay viewModel={vm} onSkip={vi.fn()} onPostpone={vi.fn()} shortcuts={both} />);
    expect(skip()).toHaveAttribute('title', copy.actions.shortcut(both.skip));
  });
});

describe('App shortcut hints', () => {
  it('shows the hints pushed by main during a rest, and drops them when main clears them', () => {
    const api = createFakeApi();
    render(<App api={api} />);

    act(() => api.push(resting(20)));
    expect(skip()).not.toHaveAttribute('title');

    act(() => api.pushShortcuts(both));
    expect(skip()).toHaveAccessibleDescription(copy.actions.shortcut(both.skip));

    act(() => api.pushShortcuts({ skip: null, postpone: null }));
    expect(skip()).not.toHaveAttribute('title');
  });

  it('never shows a shortcut during the heads-up, which has no buttons', () => {
    const api = createFakeApi();
    render(<App api={api} />);
    act(() => api.pushShortcuts(both));
    act(() => api.push(warning(10)));
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/Shortcut:/)).toBeNull();
  });

  it('does not move focus when the hints arrive', () => {
    const api = createFakeApi();
    render(<App api={api} />);
    act(() => api.push(resting(20)));
    act(() => api.pushShortcuts(both));
    expect(document.body).toHaveFocus();
  });
});
