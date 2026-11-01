// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useExercisesEnabled } from '../../src/renderer/hooks/use-exercises-enabled';
import { createFakeApi } from '../helpers/fake-api';

describe('useExercisesEnabled', () => {
  it.each([true, false])('starts from the initial value %s', (initial) => {
    const api = createFakeApi();
    const { result } = renderHook(() => useExercisesEnabled(api, initial));
    expect(result.current).toBe(initial);
  });

  it('follows pushes from main', () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useExercisesEnabled(api, true));
    act(() => api.pushExercises(false));
    expect(result.current).toBe(false);
    act(() => api.pushExercises(true));
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const api = createFakeApi();
    const { unmount } = renderHook(() => useExercisesEnabled(api, true));
    expect(api.exercisesListenerCount()).toBe(1);
    unmount();
    expect(api.exercisesListenerCount()).toBe(0);
  });
});
