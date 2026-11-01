import type { AutostartPort } from './ports';

/** The slice of Electron's `app` used for login items (Windows and macOS only). */
export interface LoginItemApp {
  getLoginItemSettings(): { readonly openAtLogin: boolean };
  setLoginItemSettings(settings: { openAtLogin: boolean }): void;
}

/**
 * Windows (registry Run key) and macOS (login item). Electron does not support this API on
 * Linux, which uses `LinuxDesktopAutostart` instead. The app has no window, so there is
 * nothing to hide at launch.
 */
export function createLoginItemAutostart(app: LoginItemApp): AutostartPort {
  return {
    getState: () => ({ supported: true, enabled: app.getLoginItemSettings().openAtLogin }),
    setEnabled: (enabled) => app.setLoginItemSettings({ openAtLogin: enabled }),
  };
}
