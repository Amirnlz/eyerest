import type { RestKind } from '../core/state';
import { copy } from './copy';
import { spokenDuration } from './spoken-duration';
import type { OverlayViewModel } from './view-model';

/**
 * Seconds remaining at which a rest announces how long is left. A 20 second eye rest needs none:
 * its start announcement already says the length. Descending order is not required.
 */
export const restMilestones: Readonly<Record<RestKind, readonly number[]>> = {
  eye: [],
  long: [60, 10],
};

/**
 * What a screen reader should hear after the view model changes from `previous` to `current`,
 * or `null` for silence (rule A2: milestones only, never every second).
 *
 * - Entering the warning or the rest announces it once.
 * - Entering an eye rest with a guided exercise adds its prompt; each later exercise announces
 *   its prompt once.
 * - During a rest, crossing a milestone announces the time actually left. A crossing, not an
 *   equality, so a skipped tick after sleep or throttling cannot swallow it.
 */
export function announcementFor(
  current: OverlayViewModel,
  previous: OverlayViewModel | null,
): string | null {
  if (current.mode === 'hidden') return null;

  if (previous === null || previous.mode !== current.mode) {
    if (current.mode === 'warning') {
      return copy.announcements.warning(spokenDuration(current.seconds));
    }
    const start = copy.announcements.restStart(current.title, spokenDuration(current.seconds));
    // The first guided exercise is part of the start, so it is read once with it.
    return current.exercise === undefined
      ? start
      : `${start} ${copy.announcements.exercise(current.exercise.prompt)}`;
  }

  if (current.mode === 'rest' && previous.mode === 'rest') {
    const crossed = restMilestones[current.kind].some(
      (milestone) => previous.seconds > milestone && current.seconds <= milestone,
    );
    if (crossed) return copy.announcements.restEnding(spokenDuration(current.seconds));

    // Each later exercise is read out once, when it appears.
    const exercise = current.exercise;
    if (exercise !== undefined && previous.exercise?.id !== exercise.id) {
      return copy.announcements.exercise(exercise.prompt);
    }
  }

  return null;
}
