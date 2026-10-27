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
 * Linux display backend: on native Wayland an application cannot choose its
 * own window position (the compositor places it, usually in the centre) and
 * cannot reliably stay on top. X11/XWayland keeps both working, so X11 is the
 * default. Override with `EYEREST_OZONE`:
 * - `x11` (default): force X11/XWayland
 * - `wayland`: force native Wayland
 * - `auto`: leave the choice to Electron
 * Unknown values fall back to the default.
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
  if (platform !== "linux")
    return { switches: [], disableHardwareAcceleration: false };

  return {
    switches: resolveOzoneSwitches(env),
    disableHardwareAcceleration: env["EYEREST_GPU"] !== "1",
  };
}

function resolveOzoneSwitches(
  env: Readonly<Record<string, string | undefined>>,
): CommandLineSwitch[] {
  const requested = (env["EYEREST_OZONE"] ?? "").trim().toLowerCase();
  if (requested === "auto") return [];
  if (requested === "wayland")
    return [{ name: "ozone-platform", value: "wayland" }];
  return [{ name: "ozone-platform", value: "x11" }];
}
