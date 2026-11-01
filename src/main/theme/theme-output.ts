import { IPC } from '../../shared/ipc';
import type { WebContentsLike } from '../snapshot-sender';
import type { ThemeOutput } from './ports';

/** Pushes the choice to every live renderer. Windows with no listener ignore it. */
export function createBroadcastThemeOutput(
  getTargets: () => readonly WebContentsLike[],
  onError: (error: unknown) => void = (error) => console.error('[theme] push failed', error),
): ThemeOutput {
  return {
    push(preference) {
      for (const target of getTargets()) {
        if (target.isDestroyed()) continue;
        try {
          target.send(IPC.theme.channel, preference);
        } catch (error) {
          onError(error);
        }
      }
    },
  };
}
