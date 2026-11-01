import {
  DEFAULT_SOUND_PREFS,
  isSoundVolume,
  type SoundPrefs,
} from '../../shared/sound';
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  themePreferences,
  type ThemePreference,
} from '../../shared/theme';

export const PREFERENCES_FILE_NAME = 'preferences.json';

/** Choices that are about the person, not the rest timing: those stay in `settings.json`. */
export interface Preferences {
  readonly sound: SoundPrefs;
  readonly theme: ThemePreference;
  /** Guided eye exercises during the 20 s rest. */
  readonly exercises: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = Object.freeze({
  sound: DEFAULT_SOUND_PREFS,
  theme: DEFAULT_THEME_PREFERENCE,
  exercises: true,
});

export interface PreferencesLoad {
  readonly prefs: Preferences;
  /** `invalid`: the file was rejected as a whole and the defaults apply. */
  readonly status: 'loaded' | 'invalid';
  readonly issues: readonly string[];
}

function invalid(reason: string): PreferencesLoad {
  return { prefs: DEFAULT_PREFERENCES, status: 'invalid', issues: [reason] };
}

/** Pure and never throws. Missing keys keep their default; a wrong type rejects the whole file. */
export function parsePreferences(text: string): PreferencesLoad {
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
  let theme = DEFAULT_THEME_PREFERENCE;
  let exercises = DEFAULT_PREFERENCES.exercises;
  const issues: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'soundMuted') {
      if (typeof value !== 'boolean') return invalid('soundMuted must be true or false');
      muted = value;
    } else if (key === 'soundVolume') {
      if (!isSoundVolume(value)) return invalid('soundVolume must be "low", "medium" or "high"');
      volume = value;
    } else if (key === 'theme') {
      if (!isThemePreference(value)) {
        return invalid(`theme must be one of ${themePreferences.map((name) => `"${name}"`).join(', ')}`);
      }
      theme = value;
    } else if (key === 'exercises') {
      if (typeof value !== 'boolean') return invalid('exercises must be true or false');
      exercises = value;
    } else {
      issues.push(`ignored unknown preference "${key}"`);
    }
  }
  return { prefs: { sound: { muted, volume }, theme, exercises }, status: 'loaded', issues };
}

export function serializePreferences(prefs: Preferences): string {
  const file = {
    soundMuted: prefs.sound.muted,
    soundVolume: prefs.sound.volume,
    theme: prefs.theme,
    exercises: prefs.exercises,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}
