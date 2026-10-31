import { DEFAULT_CONFIG, createConfig, type RestConfig } from '../../core/config';
import type { SaveSettingsResult } from '../../shared/ipc';
import { resolveConfig } from '../runtime-config';
import { SETTINGS_KEYS } from './settings';
import { validateSettingsPayload } from './settings-payload';

/** Where validated overrides are persisted. In the app: `saveSettings` on the settings file. */
export interface SettingsStorage {
  save(overrides: Partial<RestConfig>): void;
}

export interface SettingsServiceDeps {
  readonly env: Readonly<Record<string, string | undefined>>;
  /** What the settings file held at startup. */
  readonly initialOverrides?: Partial<RestConfig>;
  /** Absent in tests that never save: a save then fails instead of silently dropping data. */
  readonly storage?: SettingsStorage;
  /** Receives the effective config (env flags included) when a save changed it. */
  readonly onApply: (config: RestConfig) => void;
  readonly onError?: (error: unknown) => void;
}

const SAVE_FAILED = 'Could not save settings. Try again.';
const NO_STORAGE = 'Settings storage is unavailable.';

/**
 * Owns the user's settings on the main side: answers reads, validates and
 * persists writes, and hands the effective config to `onApply`.
 *
 * Only values that differ from the defaults are stored, so a future change of
 * a default still reaches users who never touched that field.
 * `EYEREST_FAST=1` affects the applied config only, never what is stored or read back.
 */
export class SettingsService {
  private overrides: Partial<RestConfig>;
  private applied: RestConfig;

  constructor(private readonly deps: SettingsServiceDeps) {
    this.overrides = deps.initialOverrides ?? {};
    this.applied = resolveConfig(deps.env, this.overrides);
  }

  /** The configured values (defaults plus saved changes), as the form shows them. */
  getSettings(): RestConfig {
    return createConfig(this.overrides);
  }

  /**
   * Validates, persists, then applies. Nothing is applied when persisting
   * fails, so the running app never drifts from what is on disk.
   */
  saveSettings(payload: unknown): SaveSettingsResult {
    const validated = validateSettingsPayload(payload);
    if (!validated.ok) return { ok: false, error: validated.error };

    const { storage } = this.deps;
    if (storage === undefined) return { ok: false, error: NO_STORAGE };

    const overrides = diffFromDefaults(validated.config);

    try {
      storage.save(overrides);
    } catch (error) {
      (this.deps.onError ?? defaultOnError)(error);
      return { ok: false, error: SAVE_FAILED };
    }
    this.overrides = overrides;

    // The effective config adds env flags. Saving unchanged values must not
    // restart the running cycle. `resolveConfig` cannot throw here: the payload
    // is valid and EYEREST_FAST overrides every field that could conflict.
    const next = resolveConfig(this.deps.env, overrides);
    if (!sameConfig(this.applied, next)) {
      this.applied = next;
      this.deps.onApply(next);
    }
    return { ok: true, settings: validated.config };
  }
}

function diffFromDefaults(config: RestConfig): Partial<RestConfig> {
  const overrides: Partial<Record<keyof RestConfig, number>> = {};
  for (const key of SETTINGS_KEYS) {
    if (config[key] !== DEFAULT_CONFIG[key]) overrides[key] = config[key];
  }
  return overrides;
}

function sameConfig(a: RestConfig, b: RestConfig): boolean {
  return SETTINGS_KEYS.every((key) => a[key] === b[key]);
}

function defaultOnError(error: unknown): void {
  console.error('[settings] save failed', error);
}
