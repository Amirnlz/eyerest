export interface CommandLineSwitch {
  readonly name: string;
  readonly value: string;
}

export interface StartupConfig {
  /** Chromium command-line switches to append before the app is ready. */
  readonly switches: readonly CommandLineSwitch[];
  /** Whether to call `app.disableHardwareAcceleration()` before the app is ready. */
  readonly disableHardwareAcceleration: boolean;
}

/**
 * Display and GPU settings that must be decided before Electron is ready.
 *
 * Linux display backend: left to Electron by default (native Wayland in a
 * Wayland session, X11 otherwise). The overlay does not depend on the choice,
 * because native Wayland gets the `surface` layout (see `resolvePlacement`).
 * Override with `EYEREST_OZONE=x11|wayland`. On some machines X11/XWayland
 * draws blank windows, which is why it is not forced.
 *
 * Linux GPU: the overlay is a small, mostly static panel that gains nothing
 * from hardware acceleration, while some Linux GPU/driver combinations crash
 * the GPU process (which can leave windows blank). Hardware acceleration is
 * therefore off on Linux. Set `EYEREST_GPU=1` to turn it back on.
 *
 * Other platforms need no changes.
 */
export function resolveStartupConfig(
  platform: NodeJS.Platform,
  env: Readonly<Record<string, string | undefined>>,
): StartupConfig {
  if (platform !== 'linux') {
    return { switches: [], disableHardwareAcceleration: false };
  }

  return {
    switches: resolveOzoneSwitches(env),
    disableHardwareAcceleration: env['EYEREST_GPU'] !== '1',
  };
}

function resolveOzoneSwitches(
  env: Readonly<Record<string, string | undefined>>,
): CommandLineSwitch[] {
  const requested = (env['EYEREST_OZONE'] ?? '').trim().toLowerCase();
  if (requested === 'x11' || requested === 'wayland') {
    return [{ name: 'ozone-platform', value: requested }];
  }
  return [];
}
