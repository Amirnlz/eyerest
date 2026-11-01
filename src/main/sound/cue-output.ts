import { IPC } from '../../shared/ipc';
import type { WebContentsLike } from '../snapshot-sender';
import type { CueOutput } from './ports';

/** Pushes each cue to every live renderer. Only the overlay window listens for it. */
export function createBroadcastCueOutput(
  getTargets: () => readonly WebContentsLike[],
  onError: (error: unknown) => void = (error) => console.error('[sound] push failed', error),
): CueOutput {
  return {
    play(cue) {
      for (const target of getTargets()) {
        if (target.isDestroyed()) continue;
        try {
          target.send(IPC.playCue.channel, cue);
        } catch (error) {
          onError(error);
        }
      }
    },
  };
}
