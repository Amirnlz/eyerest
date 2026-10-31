import { DEFAULT_CONFIG, type RestConfig } from './config';

export interface SettingLimit {
  /** Smallest accepted value, in the unit the config field uses (milliseconds, or a count). */
  readonly min: number;
  /** Largest accepted value. */
  readonly max: number;
}

/** A setting may go down to half of its default and up to twice its default. */
export const LIMIT_FACTOR = 2;

function around(value: number): SettingLimit {
  return { min: value / LIMIT_FACTOR, max: value * LIMIT_FACTOR };
}

/**
 * What a person may choose in settings. Deliberately not part of `createConfig`: the config also
 * carries values that are valid but outside these limits, such as `EYEREST_FAST=1` durations and a
 * hand-edited settings file. The settings form and the main-side payload check both use this table.
 */
export const SETTINGS_LIMITS: Readonly<Record<keyof RestConfig, SettingLimit>> = Object.freeze({
  workIntervalMs: around(DEFAULT_CONFIG.workIntervalMs),
  warningMs: around(DEFAULT_CONFIG.warningMs),
  eyeRestMs: around(DEFAULT_CONFIG.eyeRestMs),
  longRestMs: around(DEFAULT_CONFIG.longRestMs),
  cyclesBeforeLongRest: around(DEFAULT_CONFIG.cyclesBeforeLongRest),
  postponeMs: around(DEFAULT_CONFIG.postponeMs),
});

/** False for NaN and for anything outside the limits, ends included. */
export function isWithinLimits(key: keyof RestConfig, value: number): boolean {
  const { min, max } = SETTINGS_LIMITS[key];
  return value >= min && value <= max;
}
