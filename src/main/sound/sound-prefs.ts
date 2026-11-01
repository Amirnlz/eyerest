import {
  DEFAULT_SOUND_PREFS,
  isSoundVolume,
  type SoundPrefs,
} from '../../shared/sound';

export const SOUND_PREFS_FILE_NAME = 'preferences.json';

export interface SoundPrefsLoad {
  readonly prefs: SoundPrefs;
  /** `invalid`: the file was rejected as a whole and the defaults apply. */
  readonly status: 'loaded' | 'invalid';
  readonly issues: readonly string[];
}

function invalid(reason: string): SoundPrefsLoad {
  return { prefs: DEFAULT_SOUND_PREFS, status: 'invalid', issues: [reason] };
}

/** Pure and never throws. Missing keys keep their default; a wrong type rejects the whole file. */
export function parseSoundPrefs(text: string): SoundPrefsLoad {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return invalid(`not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return invalid('must be a JSON object');
  }

  let muted = DEFAULT_SOUND_PREFS.muted;
  let volume = DEFAULT_SOUND_PREFS.volume;
  const issues: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'soundMuted') {
      if (typeof value !== 'boolean') return invalid('soundMuted must be true or false');
      muted = value;
    } else if (key === 'soundVolume') {
      if (!isSoundVolume(value)) return invalid('soundVolume must be "low", "medium" or "high"');
      volume = value;
    } else {
      issues.push(`ignored unknown preference "${key}"`);
    }
  }
  return { prefs: { muted, volume }, status: 'loaded', issues };
}

export function serializeSoundPrefs(prefs: SoundPrefs): string {
  return `${JSON.stringify({ soundMuted: prefs.muted, soundVolume: prefs.volume }, null, 2)}\n`;
}
