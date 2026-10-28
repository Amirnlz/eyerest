import type { Phase } from '../../core/state';
import type { Snapshot } from '../../core/scheduler';
import type { SnapshotSender } from '../scheduler-controller';
import type { MediaController } from './ports';

export interface RestMediaPauserOptions {
  readonly log?: (message: string) => void;
  readonly onError?: (error: unknown) => void;
}

/**
 * Pauses media once when a rest starts: the snapshot phase changes to
 * `resting` from anything else. Never on the warning, never on later ticks of
 * the same rest. A failing controller is reported and never breaks the rest.
 *
 * Detecting the edge from snapshots keeps this adapter on the same
 * `SnapshotSender` pipeline as the overlay and the dim layer.
 */
export class RestMediaPauser implements SnapshotSender {
  private previous: Phase | null = null;
  private readonly log: (message: string) => void;
  private readonly onError: (error: unknown) => void;

  constructor(
    private readonly controller: MediaController,
    options: RestMediaPauserOptions = {},
  ) {
    this.log = options.log ?? (() => {});
    this.onError =
      options.onError ?? ((error) => console.error('[media] pause failed', error));
  }

  send(snapshot: Snapshot): void {
    const phase = snapshot.state.phase;
    const restStarted = phase === 'resting' && this.previous !== 'resting';
    this.previous = phase;
    if (restStarted) this.pause();
  }

  private pause(): void {
    // Fire and forget: the rest must start now, not after a D-Bus round trip.
    let result: ReturnType<MediaController['pauseIfPlaying']>;
    try {
      result = this.controller.pauseIfPlaying();
    } catch (error) {
      this.onError(error);
      return;
    }
    result.then(
      (handle) => this.log(`paused ${handle ? handle.players.length : 0} player(s)`),
      (error: unknown) => this.onError(error),
    );
  }
}
