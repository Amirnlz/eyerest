import type { Snapshot } from '../core/scheduler';
import type { RestKind } from '../core/state';
import { copy } from './copy';
import { formatCountdown } from './format-countdown';

export interface HiddenViewModel {
  readonly mode: 'hidden';
}

export interface WarningViewModel {
  readonly mode: 'warning';
  readonly title: string;
  readonly message: string;
  readonly seconds: number;
  /** Display text for the countdown, e.g. "15". */
  readonly countdown: string;
}

export interface RestViewModel {
  readonly mode: 'rest';
  readonly kind: RestKind;
  readonly title: string;
  readonly message: string;
  readonly seconds: number;
  /** Display text for the countdown, e.g. "20" or "9:59". */
  readonly countdown: string;
  readonly skipLabel: string;
  readonly postponeLabel: string;
}

export type OverlayViewModel = HiddenViewModel | WarningViewModel | RestViewModel;

export const HIDDEN_VIEW_MODEL: HiddenViewModel = Object.freeze({ mode: 'hidden' });

/**
 * Pure mapping from a scheduler snapshot to what the overlay shows.
 * Only the warning and resting phases are visible; every other phase hides
 * the overlay.
 */
export function toOverlayViewModel(snapshot: Snapshot): OverlayViewModel {
  const { state } = snapshot;
  const seconds = Math.max(0, snapshot.secondsRemaining ?? 0);

  switch (state.phase) {
    case 'warning':
      return {
        mode: 'warning',
        title: copy.warning.title,
        message: copy.warning.message,
        seconds,
        countdown: formatCountdown(seconds),
      };

    case 'resting':
      return {
        mode: 'rest',
        kind: state.kind,
        title: copy.rest[state.kind].title,
        message: copy.rest[state.kind].message,
        seconds,
        countdown: formatCountdown(seconds),
        skipLabel: copy.actions.skip,
        postponeLabel: copy.actions.postpone,
      };

    case 'idle':
    case 'working':
      return HIDDEN_VIEW_MODEL;
  }
}
