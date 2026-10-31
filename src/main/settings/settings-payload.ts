import { ConfigError, createConfig, type RestConfig } from '../../core/config';
import { SETTINGS_KEYS } from './settings';

export type SettingsPayloadResult =
  | { readonly ok: true; readonly config: RestConfig }
  | { readonly ok: false; readonly error: string };

function fail(error: string): SettingsPayloadResult {
  return { ok: false, error };
}

/**
 * Validates an untrusted `saveSettings` payload from a renderer. Pure: never
 * throws. Stricter than the settings file parser: the renderer owns the whole
 * form, so every key must be present and an unknown key is an error, not a
 * warning. Value rules come from `createConfig`, the single source of truth.
 */
export function validateSettingsPayload(value: unknown): SettingsPayloadResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('Settings must be an object.');
  }

  const received = new Map(Object.entries(value));
  for (const key of received.keys()) {
    if (!SETTINGS_KEYS.some((known) => known === key)) {
      return fail(`Unknown setting "${key}".`);
    }
  }

  const values: Partial<Record<keyof RestConfig, number>> = {};
  for (const key of SETTINGS_KEYS) {
    const entry = received.get(key);
    if (entry === undefined) return fail(`${key} is missing.`);
    if (typeof entry !== 'number') return fail(`${key} must be a number.`);
    values[key] = entry;
  }

  try {
    return { ok: true, config: createConfig(values) };
  } catch (error) {
    if (error instanceof ConfigError) return fail(error.message);
    throw error;
  }
}
