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
        height: `${OVERLAY_SIZE.height}px`,
      });
    });

    it('paints nothing around the panel: no background, color or border on the placement box', () => {
      const api = createFakeApi();
      render(<App api={api} layout="surface" />);

      act(() => api.push(resting(20)));

      const box = screen.getByRole('region').closest('.er-overlay-panel')?.parentElement;
      expect(box?.style.background).toBe('');
      expect(box?.style.backgroundColor).toBe('');
      expect(box?.style.color).toBe('');
      expect(box?.style.border).toBe('');
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
      const dim = screen.getByTestId('integrated-dim');
      expect(dim).toHaveClass('er-integrated-dim');
      expect(dim).not.toHaveAttribute('style');
      expect(dim).toHaveAttribute('aria-hidden', 'true');
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

  describe('guided exercises', () => {
    const prompt = (id: 'look-far' | 'roll' | 'blink') => copy.exercises[id].prompt;

    it('walks through the three exercises during a 20 s eye rest', () => {
      const api = createFakeApi();
      render(<App api={api} />);

      act(() => api.push(resting(20)));
      expect(screen.getByText(prompt('look-far'))).toBeInTheDocument();
      expect(screen.queryByText(copy.rest.eye.message)).not.toBeInTheDocument();

      act(() => api.push(resting(13)));
      expect(screen.getByText(prompt('roll'))).toBeInTheDocument();
      expect(screen.queryByText(prompt('look-far'))).not.toBeInTheDocument();

      act(() => api.push(resting(6)));
      expect(screen.getByText(prompt('blink'))).toBeInTheDocument();
    });

    it('keeps Skip, Postpone and the countdown beside the exercise', () => {
      const api = createFakeApi();
      render(<App api={api} />);
      act(() => api.push(resting(20)));
      expect(screen.getByRole('timer')).toHaveTextContent('20');
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Postpone' })).toBeInTheDocument();
    });

    it('keeps the static message for a long rest', () => {
      const api = createFakeApi();
      render(<App api={api} />);
      act(() => api.push(resting(600, 'long')));
      expect(screen.getByText(copy.rest.long.message)).toBeInTheDocument();
    });

    it('keeps the static message when started off', () => {
      const api = createFakeApi();
      render(<App api={api} initialExercises={false} />);
      act(() => api.push(resting(20)));
      expect(screen.getByText(copy.rest.eye.message)).toBeInTheDocument();
    });

    it('switches live when the tray pushes a change, even mid-rest', () => {
      const api = createFakeApi();
      render(<App api={api} />);
      act(() => api.push(resting(14)));
      expect(screen.getByText(prompt('roll'))).toBeInTheDocument();

      act(() => api.pushExercises(false));
      expect(screen.getByText(copy.rest.eye.message)).toBeInTheDocument();

      act(() => api.pushExercises(true));
      expect(screen.getByText(prompt('roll'))).toBeInTheDocument();
    });

    it('starts a new rest at the first exercise', () => {
      const api = createFakeApi();
      render(<App api={api} />);
      act(() => api.push(resting(20)));
      act(() => api.push(resting(3)));
      expect(screen.getByText(prompt('blink'))).toBeInTheDocument();

      act(() => api.push(WORKING));
      act(() => api.push(resting(20)));
      expect(screen.getByText(prompt('look-far'))).toBeInTheDocument();
    });

    it('hides the picture from assistive tech and announces each step once', () => {
      const api = createFakeApi();
      const { container } = render(<App api={api} />);
      act(() => api.push(resting(20)));
      expect(container.querySelector('.er-exercise-cue')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByRole('status')).toHaveTextContent(prompt('look-far'));

      act(() => api.push(resting(13)));
      expect(screen.getByRole('status')).toHaveTextContent(prompt('roll'));
    });

    it('fits a short rest (fast mode): 5 s shows all three in order', () => {
      const api = createFakeApi();
      render(<App api={api} />);
      const seen: string[] = [];
      for (const left of [5, 4, 3, 2, 1]) {
        act(() => api.push(resting(left)));
        for (const id of ['look-far', 'roll', 'blink'] as const) {
          if (screen.queryByText(prompt(id)) !== null && !seen.includes(id)) seen.push(id);
        }
      }
      expect(seen).toEqual(['look-far', 'roll', 'blink']);
    });
  });
});
