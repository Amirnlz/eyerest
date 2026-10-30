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
 * - During a rest, crossing a milestone announces the time actually left. A crossing, not an
 *   equality, so a skipped tick after sleep or throttling cannot swallow it.
 */
export function announcementFor(
  current: OverlayViewModel,
  previous: OverlayViewModel | null,
): string | null {
  if (current.mode === 'hidden') return null;

  if (previous === null || previous.mode !== current.mode) {
    return current.mode === 'warning'
      ? copy.announcements.warning(spokenDuration(current.seconds))
      : copy.announcements.restStart(current.title, spokenDuration(current.seconds));
  }

  if (current.mode === 'rest' && previous.mode === 'rest') {
    const crossed = restMilestones[current.kind].some(
      (milestone) => previous.seconds > milestone && current.seconds <= milestone,
    );
    if (crossed) return copy.announcements.restEnding(spokenDuration(current.seconds));
  }

  return null;
}
