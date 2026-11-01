import { IPC } from '../../shared/ipc';
import type { WebContentsLike } from '../snapshot-sender';
import type { ExercisesOutput } from './ports';

/** Pushes the switch to every live renderer. Windows with no listener ignore it. */
export function createBroadcastExercisesOutput(
  getTargets: () => readonly WebContentsLike[],
  onError: (error: unknown) => void = (error) => console.error('[exercises] push failed', error),
): ExercisesOutput {
  return {
    push(enabled) {
      for (const target of getTargets()) {
        if (target.isDestroyed()) continue;
        try {
          target.send(IPC.exercises.channel, enabled);
        } catch (error) {
          onError(error);
        }
      }
    },
  };
}
