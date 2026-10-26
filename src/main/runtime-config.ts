import { createConfig, type RestConfig } from '../core/config';

/**
 * Short durations for manual testing: `EYEREST_FAST=1`.
 * 20 s work, 5 s warning, 5 s eye rest, 10 s long rest, 10 s postpone.
 */
export const FAST_MODE_CONFIG: Partial<RestConfig> = Object.freeze({
  workIntervalMs: 20_000,
  warningMs: 5_000,
  eyeRestMs: 5_000,
  longRestMs: 10_000,
  postponeMs: 10_000,
});

/** Builds the validated config from the process environment. */
export function resolveConfig(env: Readonly<Record<string, string | undefined>>): RestConfig {
  return createConfig(env['EYEREST_FAST'] === '1' ? FAST_MODE_CONFIG : {});
}
