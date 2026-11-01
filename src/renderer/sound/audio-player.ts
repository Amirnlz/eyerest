import { SOUND_CUES, type PlayCue, type SoundCue } from '../../shared/sound';

/** The part of `HTMLAudioElement` the player uses. Lets tests inject a fake. */
export interface AudioLike {
  currentTime: number;
  volume: number;
  preload: string;
  play(): Promise<void> | void;
}

export type CreateAudio = (url: string) => AudioLike;

export interface SoundPlayer {
  play(cue: PlayCue): void;
}

export interface AudioPlayerOptions {
  readonly urls: Readonly<Record<SoundCue, string>>;
  readonly createAudio: CreateAudio;
  readonly log?: (message: string) => void;
}

export const createBrowserAudio: CreateAudio = (url) => new Audio(url);

/**
 * Plays cues with one preloaded audio element each. A missing or undecodable file, or a refused
 * `play()`, is logged and swallowed: a sound must never break a rest. A cue that arrives while
 * the previous one still rings restarts it from the beginning.
 */
export function createAudioPlayer(options: AudioPlayerOptions): SoundPlayer {
  const log = options.log ?? (() => undefined);
  const elements = new Map<SoundCue, AudioLike>();

  const elementFor = (cue: SoundCue): AudioLike | null => {
    const existing = elements.get(cue);
    if (existing) return existing;
    try {
      const created = options.createAudio(options.urls[cue]);
      created.preload = 'auto';
      elements.set(cue, created);
      return created;
    } catch (error) {
      log(`could not load sound "${cue}": ${String(error)}`);
      return null;
    }
  };

  // Load now, so the first cue does not wait on the disk.
  for (const cue of SOUND_CUES) elementFor(cue);

  return {
    play({ cue, gain }) {
      const audio = elementFor(cue);
      if (audio === null) return;
      try {
        audio.currentTime = 0;
        audio.volume = Math.min(1, Math.max(0, gain));
        const result = audio.play();
        if (result instanceof Promise) {
          result.catch((error: unknown) => log(`could not play sound "${cue}": ${String(error)}`));
        }
      } catch (error) {
        log(`could not play sound "${cue}": ${String(error)}`);
      }
    },
  };
}
