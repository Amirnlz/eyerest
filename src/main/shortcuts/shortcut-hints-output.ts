import { IPC } from '../../shared/ipc';
import type { WebContentsLike } from '../snapshot-sender';
import type { ShortcutHintsOutput } from './ports';

/** Pushes the hints to every live renderer. Windows with no listener ignore them. */
export function createBroadcastShortcutHintsOutput(
  getTargets: () => readonly WebContentsLike[],
  onError: (error: unknown) => void = (error) => console.error('[shortcuts] push failed', error),
): ShortcutHintsOutput {
  return {
    push(hints) {
      for (const target of getTargets()) {
        if (target.isDestroyed()) continue;
        try {
          target.send(IPC.shortcuts.channel, hints);
        } catch (error) {
          onError(error);
        }
      }
    },
  };
}
