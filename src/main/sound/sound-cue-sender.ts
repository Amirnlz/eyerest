import type { EngineEvent } from '../../core/state';
import type { Snapshot } from '../../core/scheduler';
import { VOLUME_GAIN, type SoundCue } from '../../shared/sound';
import type { SnapshotSender } from '../scheduler-controller';
import type { CueOutput, SoundPrefsPort } from './ports';

/**
 * Which cue an engine event earns. A rest that is skipped or postponed ends without a cue: the
 * person acted, so a chime would only be noise. `rest-completed` means the full rest ran out.
 */
export function cueForEvent(event: EngineEvent): SoundCue | null {
  switch (event.type) {
    case 'rest-started':
      return 'rest-start';
    case 'rest-completed':
      return 'rest-end';
    default:
      return null;
  }
}

/**
 * Adapter on the scheduler's event stream: turns events into cues and hands them to the output.
 * It decides nothing about audio itself (the renderer plays). Muted means nothing is sent.
 */
export class SoundCueSender implements SnapshotSender {
  constructor(
    private readonly prefs: Pick<SoundPrefsPort, 'get'>,
    private readonly output: CueOutput,
  ) {}

  send(_snapshot: Snapshot, events: readonly EngineEvent[] = []): void {
    const prefs = this.prefs.get();
    if (prefs.muted) return;
    for (const event of events) {
      const cue = cueForEvent(event);
      if (cue !== null) this.output.play({ cue, gain: VOLUME_GAIN[prefs.volume] });
    }
  }
}
