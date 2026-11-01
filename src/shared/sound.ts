/** The sounds the app plays. Each has a file in `resources/sounds/<cue>.ogg`. */
export const SOUND_CUES = ['rest-start', 'rest-end'] as const;
export type SoundCue = (typeof SOUND_CUES)[number];

/** Volume steps offered in the tray, and the gain each one plays at (0 to 1). */
export const SOUND_VOLUMES = ['low', 'medium', 'high'] as const;
export type SoundVolume = (typeof SOUND_VOLUMES)[number];

export const VOLUME_GAIN: Readonly<Record<SoundVolume, number>> = Object.freeze({
  low: 0.25,
  medium: 0.5,
  high: 1,
});

export interface SoundPrefs {
  readonly muted: boolean;
  readonly volume: SoundVolume;
}

export const DEFAULT_SOUND_PREFS: SoundPrefs = Object.freeze({ muted: false, volume: 'medium' });

/** What main pushes to the renderer: play this cue at this gain. */
export interface PlayCue {
  readonly cue: SoundCue;
  /** 0 to 1. */
  readonly gain: number;
}

export function isSoundCue(value: unknown): value is SoundCue {
  return SOUND_CUES.some((cue) => cue === value);
}

export function isSoundVolume(value: unknown): value is SoundVolume {
  return SOUND_VOLUMES.some((volume) => volume === value);
}

/** Validates an untrusted push payload. Returns null for anything that is not a well-formed cue. */
export function parsePlayCue(value: unknown): PlayCue | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const cue: unknown = Reflect.get(value, 'cue');
  const gain: unknown = Reflect.get(value, 'gain');
  if (!isSoundCue(cue)) return null;
  if (typeof gain !== 'number' || !Number.isFinite(gain) || gain < 0 || gain > 1) return null;
  return { cue, gain };
}
