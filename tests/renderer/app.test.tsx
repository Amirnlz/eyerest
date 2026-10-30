// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/renderer/App';
import { OVERLAY_MARGIN, OVERLAY_SIZE } from '../../src/shared/overlay-layout';
import { copy } from '../../src/renderer/copy';
import { WORKING, createFakeApi, resting, warning } from '../helpers/fake-api';

describe('App', () => {
  it('renders nothing before the first snapshot', () => {
    const api = createFakeApi();
    const { container } = render(<App api={api} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while working', async () => {
    const api = createFakeApi();
    const { container } = render(<App api={api} />);

    await act(async () => api.resolveSnapshot(WORKING));

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the warning countdown without buttons', () => {
    const api = createFakeApi();
    render(<App api={api} />);

    act(() => api.push(warning(15)));

    expect(
      screen.getByRole('heading', { name: copy.warning.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('15');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the rest panel and counts down as snapshots are pushed', () => {
    const api = createFakeApi();
    render(<App api={api} />);

    act(() => api.push(resting(20)));
    expect(screen.getByRole('timer')).toHaveTextContent('20');
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();

    act(() => api.push(resting(19)));
    expect(screen.getByRole('timer')).toHaveTextContent('19');
  });

  it('sends skip to the main process when Skip is clicked', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    render(<App api={api} />);
    act(() => api.push(resting(20)));

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(api.skip).toHaveBeenCalledTimes(1);
    expect(api.postpone).not.toHaveBeenCalled();
  });

  it('sends postpone to the main process when Postpone is clicked', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    render(<App api={api} />);
    act(() => api.push(resting(20)));

    await user.click(screen.getByRole('button', { name: 'Postpone' }));

    expect(api.postpone).toHaveBeenCalledTimes(1);
    expect(api.skip).not.toHaveBeenCalled();
  });

  it('hides everything again when the rest ends', () => {
    const api = createFakeApi();
    const { container } = render(<App api={api} />);

    act(() => api.push(resting(1)));
    act(() => api.push(WORKING));

    expect(container).toBeEmptyDOMElement();
  });

  describe('surface layout', () => {
    it('renders nothing when hidden, so the transparent window stays empty', () => {
      const api = createFakeApi();
      const { container } = render(<App api={api} layout="surface" />);

      act(() => api.push(WORKING));

      expect(container).toBeEmptyDOMElement();
    });

    it('places the panel at the top-right with the shared margin and width', () => {
      const api = createFakeApi();
      render(<App api={api} layout="surface" />);

      act(() => api.push(resting(20)));

      const panel = screen.getByRole('region').closest('.er-overlay-panel')?.parentElement;
      expect(panel).toHaveStyle({
        position: 'fixed',
        top: `${OVERLAY_MARGIN}px`,
        right: `${OVERLAY_MARGIN}px`,
        width: `${OVERLAY_SIZE.width}px`,
      });
    });

    it('shows the warning panel without buttons', () => {
      const api = createFakeApi();
      render(<App api={api} layout="surface" />);

      act(() => api.push(warning(15)));

      expect(screen.getByRole('timer')).toHaveTextContent('15');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('still sends skip and postpone', async () => {
      const user = userEvent.setup();
      const api = createFakeApi();
      render(<App api={api} layout="surface" />);
      act(() => api.push(resting(20)));

      await user.click(screen.getByRole('button', { name: 'Skip' }));
      await user.click(screen.getByRole('button', { name: 'Postpone' }));

      expect(api.skip).toHaveBeenCalledTimes(1);
      expect(api.postpone).toHaveBeenCalledTimes(1);
    });

    it('draws the dim scrim behind the panel during rest in integrated mode', () => {
      const api = createFakeApi();
      render(<App api={api} layout="surface" integratedDim />);

      act(() => api.push(warning(15)));
      expect(screen.queryByTestId('integrated-dim')).not.toBeInTheDocument();

      act(() => api.push(resting(20)));
      expect(screen.getByTestId('integrated-dim')).toHaveStyle({
        background: 'rgba(32, 32, 32, 0.6)',
      });
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('does not add a wrapper in the positioned layout', () => {
      const api = createFakeApi();
      const { container } = render(<App api={api} layout="positioned" />);

      act(() => api.push(resting(20)));

      // The first element is the overlay panel itself, not a positioning wrapper around it.
      expect(container.firstElementChild).toHaveClass('er-overlay-panel');
      expect(container.firstElementChild).not.toHaveAttribute('style');
    });
  });
});
