import { IPC } from '../shared/ipc';
import type { SnapshotSender } from './scheduler-controller';

/** The part of Electron's `webContents` the sender uses. */
export interface WebContentsLike {
  isDestroyed(): boolean;
  send(channel: string, ...args: unknown[]): void;
}

/**
 * Broadcasts each snapshot to every live renderer. A destroyed or failing
 * renderer never prevents the others from receiving the update.
 */
export function createBroadcastSender(
  getTargets: () => readonly WebContentsLike[],
  onError: (error: unknown) => void = (error) =>
    console.error('[snapshot-sender] send failed', error),
): SnapshotSender {
  return {
    send(snapshot) {
      for (const target of getTargets()) {
        if (target.isDestroyed()) continue;
        try {
          target.send(IPC.snapshot.channel, snapshot);
        } catch (error) {
          onError(error);
        }
      }
    },
  };
}
