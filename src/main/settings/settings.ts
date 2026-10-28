import { ConfigError, createConfig, type RestConfig } from '../../core/config';

export const SETTINGS_FILE_NAME = 'settings.json';

const SETTINGS_KEYS: readonly (keyof RestConfig)[] = [
  'workIntervalMs',
  'warningMs',
  'eyeRestMs',
  'longRestMs',
  'cyclesBeforeLongRest',
  'postponeMs',
];

/** The file operations the settings store needs. Sync: it runs once at startup. */
export interface SettingsFs {
  /** The file's text, or `null` when it does not exist. Other errors throw. */
  readFile(path: string): string | null;
  writeFile(path: string, text: string): void;
  rename(from: string, to: string): void;
  remove(path: string): void;
  ensureDir(path: string): void;
}

export interface SettingsLoad {
  /** Valid overrides to merge onto the defaults. Empty unless `status` is `loaded`. */
  readonly overrides: Partial<RestConfig>;
  /**
   * `missing`: no file, defaults apply. `loaded`: overrides are valid.
   * `invalid`: the file was rejected as a whole and defaults apply.
   */
  readonly status: 'missing' | 'loaded' | 'invalid';
  /** Human-readable problems to report. Also set for `loaded` (ignored keys). */
  readonly issues: readonly string[];
}

const MISSING: SettingsLoad = { overrides: {}, status: 'missing', issues: [] };

function invalid(issue: string): SettingsLoad {
  return { overrides: {}, status: 'invalid', issues: [issue] };
}

/**
 * Parses settings text. Pure: never throws.
 * - Any invalid value rejects the whole file (partial application of a broken
 *   file would hide the mistake).
 * - Unknown keys are ignored and reported, so a typo is visible.
 */
export function parseSettings(text: string): SettingsLoad {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return invalid(
      `not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return invalid('must be a JSON object');
  }

  const overrides: Partial<Record<keyof RestConfig, number>> = {};
  const issues: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    const known = SETTINGS_KEYS.find((candidate) => candidate === key);
    if (known === undefined) {
      issues.push(`ignored unknown setting "${key}"`);
      continue;
    }
    if (typeof value !== 'number') return invalid(`${key} must be a number`);
    overrides[known] = value;
  }

  try {
    createConfig(overrides);
  } catch (error) {
    if (error instanceof ConfigError) return invalid(error.message);
    throw error;
  }
  return { overrides, status: 'loaded', issues };
}

/** Loads settings from disk. Never throws: any failure becomes `invalid`. */
export function loadSettings(fs: SettingsFs, path: string): SettingsLoad {
  let text: string | null;
  try {
    text = fs.readFile(path);
  } catch (error) {
    return invalid(`could not read file:
       ${error instanceof Error ? error.message : String(error)}`);
  }
  return text === null ? MISSING : parseSettings(text);
}

/**
 * Saves overrides atomically: write a temp file, then rename it over the
 * target, so a crash never leaves a half-written settings file.
 * Throws `ConfigError` (nothing written) when the values are invalid.
 */
export function saveSettings(
  fs: SettingsFs,
  path: string,
  overrides: Partial<RestConfig>,
): void {
  createConfig(overrides);

  const temp = `${path}.tmp`;
  try {
    fs.ensureDir(dirname(path));
    fs.writeFile(temp, `${JSON.stringify(overrides, null, 2)}\n`);
    fs.rename(temp, path);
  } catch (error) {
    try {
      fs.remove(temp);
    } catch {
      // The temp file is a leftover only; the original error matters more.
    }
    throw error;
  }
}

function dirname(path: string): string {
  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return index <= 0 ? '.' : path.slice(0, index);
}
