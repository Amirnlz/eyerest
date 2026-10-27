// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSchedulerSnapshot } from '../../src/renderer/hooks/use-scheduler-snapshot';
import { IDLE, WORKING, createFakeApi, resting, warning } from '../helpers/fake-api';

describe('useSchedulerSnapshot', () => {
  it('returns null until the first snapshot arrives', () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useSchedulerSnapshot(api));
    expect(result.current).toBeNull();
  });

  it('uses the initial getSnapshot answer', async () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useSchedulerSnapshot(api));

    await act(async () => api.resolveSnapshot(WORKING));

    expect(result.current).toEqual(WORKING);
  });

  it('updates on each pushed snapshot', () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useSchedulerSnapshot(api));

    act(() => api.push(warning(15)));
    expect(result.current).toEqual(warning(15));

    act(() => api.push(warning(14)));
    expect(result.current).toEqual(warning(14));

    act(() => api.push(resting(20)));
    expect(result.current).toEqual(resting(20));
  });

  it('keeps a pushed snapshot when the older initial answer arrives later', async () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useSchedulerSnapshot(api));

    act(() => api.push(resting(18)));
    await act(async () => api.resolveSnapshot(IDLE));

    expect(result.current).toEqual(resting(18));
  });

  it('lets a pushed snapshot replace the initial answer', async () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useSchedulerSnapshot(api));

    await act(async () => api.resolveSnapshot(WORKING));
    act(() => api.push(warning(15)));

    expect(result.current).toEqual(warning(15));
  });

  it('subscribes once and unsubscribes on unmount', () => {
    const api = createFakeApi();
    const { unmount } = renderHook(() => useSchedulerSnapshot(api));
    expect(api.listenerCount()).toBe(1);

    unmount();

    expect(api.listenerCount()).toBe(0);
  });

  it('does not fail when the initial answer arrives after unmount', async () => {
    const api = createFakeApi();
    const { unmount } = renderHook(() => useSchedulerSnapshot(api));
    unmount();

    await act(async () => api.resolveSnapshot(WORKING));
  });

  it('survives a failing getSnapshot and still receives pushes', async () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useSchedulerSnapshot(api));

    await act(async () => api.rejectSnapshot(new Error('main not ready')));
    expect(result.current).toBeNull();

    act(() => api.push(WORKING));
    await waitFor(() => expect(result.current).toEqual(WORKING));
  });
});
