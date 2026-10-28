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

/**
 * Builds the validated config. Precedence, lowest to highest: defaults, the
 * settings file, `EYEREST_FAST=1`. The env flag wins so manual and e2e runs
 * stay short whatever the user's settings file says.
 */
export function resolveConfig(
  env: Readonly<Record<string, string | undefined>>,
  settingsOverrides: Partial<RestConfig> = {},
): RestConfig {
  return createConfig({
    ...settingsOverrides,
    ...(env['EYEREST_FAST'] === '1' ? FAST_MODE_CONFIG : {}),
  });
}
