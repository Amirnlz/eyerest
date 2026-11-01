// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRestTotal } from '../../src/renderer/hooks/use-rest-total';
import { copy } from '../../src/renderer/copy';
import { HIDDEN_VIEW_MODEL, type OverlayViewModel } from '../../src/renderer/view-model';

const rest = (kind: 'eye' | 'long', seconds: number): OverlayViewModel => ({
  mode: 'rest',
  kind,
  title: copy.rest[kind].title,
  message: copy.rest[kind].message,
  seconds,
  countdown: String(seconds),
  skipLabel: copy.actions.skip,
  postponeLabel: copy.actions.postpone,
});

describe('useRestTotal', () => {
  it('is 0 when there is no rest', () => {
    const { result } = renderHook(() => useRestTotal(HIDDEN_VIEW_MODEL));
    expect(result.current).toBe(0);
  });

  it('keeps the first value of a rest as its total while the countdown falls', () => {
    const { result, rerender } = renderHook(({ vm }) => useRestTotal(vm), {
      initialProps: { vm: rest('eye', 20) },
    });
    expect(result.current).toBe(20);
    rerender({ vm: rest('eye', 13) });
    expect(result.current).toBe(20);
    rerender({ vm: rest('eye', 1) });
    expect(result.current).toBe(20);
  });

  it('forgets the total when the rest ends, so the next rest starts fresh', () => {
    const { result, rerender } = renderHook(({ vm }) => useRestTotal(vm), {
      initialProps: { vm: rest('eye', 20) },
    });
    rerender({ vm: HIDDEN_VIEW_MODEL });
    expect(result.current).toBe(0);
    rerender({ vm: rest('eye', 5) });
    expect(result.current).toBe(5);
  });

  it('starts over when the kind changes', () => {
    const { result, rerender } = renderHook(({ vm }) => useRestTotal(vm), {
      initialProps: { vm: rest('eye', 20) },
    });
    rerender({ vm: rest('long', 600) });
    expect(result.current).toBe(600);
  });

  it('grows when the countdown rises, as after a late wake that restarts the rest', () => {
    const { result, rerender } = renderHook(({ vm }) => useRestTotal(vm), {
      initialProps: { vm: rest('eye', 8) },
    });
    rerender({ vm: rest('eye', 20) });
    expect(result.current).toBe(20);
  });
});
