import type { Snapshot } from '../core/scheduler';
import type { RestKind } from '../core/state';
import { copy } from './copy';
import { exerciseAt, type ExerciseId } from './exercise/exercises';
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

/** The guided exercise showing now. It replaces the static message of an eye rest. */
export interface RestExercise {
  readonly id: ExerciseId;
  readonly name: string;
  readonly prompt: string;
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
  /** Set by `withExercise`. Absent for a long rest, or when exercises are off. */
  readonly exercise?: RestExercise;
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
    case 'away':
    case 'working':
      return HIDDEN_VIEW_MODEL;
  }
}

export interface ExerciseOptions {
  /** The person's choice. Off keeps today's static message. */
  readonly enabled: boolean;
  /** Whole seconds in the whole rest, as first seen when it began. */
  readonly totalSeconds: number;
}

/**
 * Adds the current guided exercise to an eye rest. A long rest keeps its static message: the
 * advice there is to stand up and stretch. Any other mode, and a disabled setting, pass through
 * untouched (same object), so a view model only changes when an exercise really applies.
 */
export function withExercise(viewModel: OverlayViewModel, options: ExerciseOptions): OverlayViewModel {
  if (!options.enabled || viewModel.mode !== 'rest' || viewModel.kind !== 'eye') return viewModel;
  const id = exerciseAt(viewModel.seconds, options.totalSeconds);
  const text = copy.exercises[id];
  return { ...viewModel, exercise: { id, name: text.name, prompt: text.prompt } };
}
