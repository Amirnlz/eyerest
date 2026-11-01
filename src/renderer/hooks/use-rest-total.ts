import { useRef } from 'react';
import type { OverlayViewModel } from '../view-model';

interface Tracked {
  readonly kind: 'eye' | 'long' | null;
  readonly total: number;
}

/**
 * The length of the rest on screen, in whole seconds. The snapshot carries only what is left, so
 * the first value seen in a rest is its full length (the overlay window is created at launch and
 * receives every snapshot, so that is the real start). It resets when the rest ends or its kind
 * changes, and 0 means no rest.
 *
 * Written during render on purpose: the result is the same however many times React renders,
 * and an effect would show one stale frame at the start of every rest.
 */
export function useRestTotal(viewModel: OverlayViewModel): number {
  const tracked = useRef<Tracked>({ kind: null, total: 0 });

  if (viewModel.mode !== 'rest') {
    tracked.current = { kind: null, total: 0 };
  } else if (tracked.current.kind !== viewModel.kind) {
    tracked.current = { kind: viewModel.kind, total: viewModel.seconds };
  } else if (viewModel.seconds > tracked.current.total) {
    tracked.current = { kind: viewModel.kind, total: viewModel.seconds };
  }
  return tracked.current.total;
}
