import type { PlayCue, SoundPrefs } from '../../shared/sound';

/** The person's sound choices. Read live, so a tray change applies to the next cue. */
export interface SoundPrefsPort {
  get(): SoundPrefs;
  set(next: SoundPrefs): void;
}

/** Where a cue goes. In the app this is a push to the overlay renderer, which owns the audio. */
export interface CueOutput {
  play(cue: PlayCue): void;
}
