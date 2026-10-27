import {
  isOverlayLayout,
  type OverlayLayout,
} from '../../shared/overlay-layout';

/**
 * Chooses how the overlay window is laid out.
 *
 * - `EYEREST_PLACEMENT=positioned|surface` forces a layout (for testing).
 * - Native Wayland (Linux) cannot position windows, so it gets `surface`.
 *   Detected from the Chromium `ozone-platform` switch when set, otherwise
 *   from the session environment.
 * - Everything else (Windows, macOS, Linux on X11) gets `positioned`.
 */
export function resolvePlacement(
  platform: NodeJS.Platform,
  env: Readonly<Record<string, string | undefined>>,
  ozoneSwitch: string,
): OverlayLayout {
  const forced = (env['EYEREST_PLACEMENT'] ?? '').trim().toLowerCase();
  if (isOverlayLayout(forced)) return forced;

  if (platform !== 'linux') return 'positioned';

  const ozone = ozoneSwitch.trim().toLowerCase();
  if (ozone === 'wayland') return 'surface';
  if (ozone === 'x11') return 'positioned';

  const sessionType = (env['XDG_SESSION_TYPE'] ?? '').trim().toLowerCase();
  if (sessionType === 'wayland' || Boolean(env['WAYLAND_DISPLAY'])) {
    return 'surface';
  }
  return 'positioned';
}
