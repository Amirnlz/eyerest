import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, type RestConfig } from '../../src/core/config';
import { FAST_MODE_CONFIG } from '../../src/main/runtime-config';
import { SettingsService } from '../../src/main/settings/settings-service';

const MIN = 60_000;

function setup(
  options: {
    env?: Record<string, string>;
    initialOverrides?: Partial<RestConfig>;
    withStorage?: boolean;
    saveError?: Error;
  } = {},
) {
  const saved: Partial<RestConfig>[] = [];
  const applied: RestConfig[] = [];
  const onError = vi.fn();
  const storage =
    options.withStorage === false
      ? undefined
      : {
          save: (overrides: Partial<RestConfig>) => {
            if (options.saveError) throw options.saveError;
            saved.push(overrides);
          },
        };
  const service = new SettingsService({
    env: options.env ?? {},
    initialOverrides: options.initialOverrides,
    storage,
    onApply: (config) => applied.push(config),
    onError,
  });
  return { service, saved, applied, onError };
}

describe('SettingsService.getSettings', () => {
  it('returns the defaults when nothing was saved', () => {
    expect(setup().service.getSettings()).toEqual(DEFAULT_CONFIG);
  });

  it('returns defaults merged with the settings file overrides', () => {
    const { service } = setup({ initialOverrides: { workIntervalMs: 30 * MIN } });
    expect(service.getSettings()).toEqual({ ...DEFAULT_CONFIG, workIntervalMs: 30 * MIN });
  });

  it('does not leak EYEREST_FAST into what the form shows', () => {
    const { service } = setup({ env: { EYEREST_FAST: '1' } });
    expect(service.getSettings()).toEqual(DEFAULT_CONFIG);
  });

  it('returns what was last saved', () => {
    const { service } = setup();
    service.saveSettings({ ...DEFAULT_CONFIG, postponeMs: 2 * MIN });
    expect(service.getSettings().postponeMs).toBe(2 * MIN);
  });
});

describe('SettingsService.saveSettings', () => {
  it('persists only values that differ from the defaults', () => {
    const { service, saved } = setup();
    service.saveSettings({ ...DEFAULT_CONFIG, workIntervalMs: 30 * MIN, cyclesBeforeLongRest: 4 });
    expect(saved).toEqual([{ workIntervalMs: 30 * MIN, cyclesBeforeLongRest: 4 }]);
  });

  it('persists an empty object when everything is back at the defaults', () => {
    const { service, saved } = setup({ initialOverrides: { workIntervalMs: 30 * MIN } });
    service.saveSettings({ ...DEFAULT_CONFIG });
    expect(saved).toEqual([{}]);
    expect(service.getSettings()).toEqual(DEFAULT_CONFIG);
  });

  it('returns ok with the saved settings and applies the effective config once', () => {
    const { service, applied } = setup();
    const next = { ...DEFAULT_CONFIG, eyeRestMs: 30_000 };

    expect(service.saveSettings(next)).toEqual({ ok: true, settings: next });
    expect(applied).toEqual([next]);
  });

  it('does not apply (no cycle restart) when nothing changed', () => {
    const { service, applied, saved } = setup();
    expect(service.saveSettings({ ...DEFAULT_CONFIG }).ok).toBe(true);
    expect(applied).toEqual([]);
    expect(saved).toHaveLength(1);
  });

  it('applies on change, then not again for the same values', () => {
    const { service, applied } = setup();
    const next = { ...DEFAULT_CONFIG, postponeMs: 2 * MIN };
    service.saveSettings(next);
    service.saveSettings({ ...next });
    expect(applied).toHaveLength(1);
  });

  it('applies the config with EYEREST_FAST on top of the saved values', () => {
    const { service, applied } = setup({ env: { EYEREST_FAST: '1' } });
    service.saveSettings({ ...DEFAULT_CONFIG, cyclesBeforeLongRest: 5, workIntervalMs: 99 * MIN });

    expect(applied).toHaveLength(1);
    expect(applied[0]).toMatchObject({
      ...FAST_MODE_CONFIG,
      cyclesBeforeLongRest: 5,
    });
  });

  it('rejects an invalid payload: nothing saved, nothing applied', () => {
    const { service, saved, applied } = setup();
    const result = service.saveSettings({ ...DEFAULT_CONFIG, eyeRestMs: -1 });

    expect(result.ok).toBe(false);
    expect(saved).toEqual([]);
    expect(applied).toEqual([]);
  });

  it('rejects a payload that is not an object', () => {
    const { service, saved } = setup();
    expect(service.saveSettings('nope')).toEqual({ ok: false, error: 'Settings must be an object.' });
    expect(saved).toEqual([]);
  });

  it('keeps the previous settings after a rejected save', () => {
    const { service } = setup({ initialOverrides: { postponeMs: 2 * MIN } });
    service.saveSettings({ ...DEFAULT_CONFIG, eyeRestMs: 0 });
    expect(service.getSettings().postponeMs).toBe(2 * MIN);
  });

  it('answers ok:false, reports the cause and applies nothing when persisting fails', () => {
    const failure = new Error('EACCES');
    const { service, applied, onError } = setup({ saveError: failure });

    const result = service.saveSettings({ ...DEFAULT_CONFIG, postponeMs: 2 * MIN });

    expect(result).toEqual({ ok: false, error: 'Could not save settings. Try again.' });
    expect(onError).toHaveBeenCalledWith(failure);
    expect(applied).toEqual([]);
    expect(service.getSettings().postponeMs).toBe(DEFAULT_CONFIG.postponeMs);
  });

  it('does not expose the technical error text to the renderer', () => {
    const { service } = setup({ saveError: new Error('EACCES: /home/me/.config/eyerest') });
    const result = service.saveSettings({ ...DEFAULT_CONFIG, postponeMs: 2 * MIN });
    expect(JSON.stringify(result)).not.toMatch(/EACCES|home/);
  });

  it('answers ok:false when no storage is configured', () => {
    const { service, applied } = setup({ withStorage: false });
    const result = service.saveSettings({ ...DEFAULT_CONFIG, postponeMs: 2 * MIN });
    expect(result).toEqual({ ok: false, error: 'Settings storage is unavailable.' });
    expect(applied).toEqual([]);
  });
});
