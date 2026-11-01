// @vitest-environment jsdom
import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/renderer/App';
import { useSoundCues } from '../../src/renderer/hooks/use-sound-cues';
import { WORKING, createFakeApi, resting } from '../helpers/fake-api';

describe('useSoundCues', () => {
  it('plays each pushed cue through the player', () => {
    const api = createFakeApi();
    const player = { play: vi.fn() };
    renderHook(() => useSoundCues(api, player));

    act(() => api.pushCue({ cue: 'rest-start', gain: 0.5 }));
    act(() => api.pushCue({ cue: 'rest-end', gain: 1 }));

    expect(player.play).toHaveBeenNthCalledWith(1, { cue: 'rest-start', gain: 0.5 });
    expect(player.play).toHaveBeenNthCalledWith(2, { cue: 'rest-end', gain: 1 });
  });

  it('does not subscribe without a player', () => {
    const api = createFakeApi();
    renderHook(() => useSoundCues(api, undefined));
    expect(api.cueListenerCount()).toBe(0);
  });

  it('unsubscribes on unmount, so a late cue plays nothing', () => {
    const api = createFakeApi();
    const player = { play: vi.fn() };
    const { unmount } = renderHook(() => useSoundCues(api, player));
    expect(api.cueListenerCount()).toBe(1);

    unmount();
    api.pushCue({ cue: 'rest-end', gain: 1 });

    expect(api.cueListenerCount()).toBe(0);
    expect(player.play).not.toHaveBeenCalled();
  });

  it('subscribes once across re-renders with the same player', () => {
    const api = createFakeApi();
    const player = { play: vi.fn() };
    const { rerender } = renderHook(() => useSoundCues(api, player));
    rerender();
    rerender();
    expect(api.cueListenerCount()).toBe(1);
  });
});

describe('App sound cues', () => {
  it('plays a cue even while the overlay is hidden (rest end arrives as the overlay hides)', () => {
    const api = createFakeApi();
    const player = { play: vi.fn() };
    const { container } = render(<App api={api} soundPlayer={player} />);

    act(() => api.push(resting(5)));
    act(() => api.push(WORKING));
    expect(container).toBeEmptyDOMElement();

    act(() => api.pushCue({ cue: 'rest-end', gain: 0.5 }));

    expect(player.play).toHaveBeenCalledWith({ cue: 'rest-end', gain: 0.5 });
  });

  it('stays silent without a sound player', () => {
    const api = createFakeApi();
    render(<App api={api} />);
    expect(api.cueListenerCount()).toBe(0);
  });
});
