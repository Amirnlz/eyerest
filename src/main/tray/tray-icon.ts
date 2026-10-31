import { join } from 'node:path';

/**
 * Which tray icon file to show, and where the files live. Pure: no Electron. The files are made by
 * `src/design/brand-icons.ts` into `resources/tray/`.
 *
 * - macOS: one template image. The system recolors it for the menu bar and the active appearance.
 * - Windows and Linux: a dark glyph for light surfaces and a light glyph for dark ones. The caller
 *   passes whether the OS draws dark colors. On Windows the taskbar follows the system theme while
 *   Electron reports the app theme, so the two can differ; see docs/design-system.md.
 *
 * Each file has an `@2x` sibling that Electron picks up by itself on high-DPI displays.
 */

export type TrayIconFile = 'trayTemplate.png' | 'tray-on-light.png' | 'tray-on-dark.png';

export const TRAY_ICON_FILES: readonly TrayIconFile[] = [
  'trayTemplate.png',
  'tray-on-light.png',
  'tray-on-dark.png',
];

/** Folder name inside the packaged app's resources (`extraResources` in electron-builder.json). */
export const TRAY_ICON_DIR_NAME = 'tray';

export function selectTrayIconFile(platform: NodeJS.Platform, darkColors: boolean): TrayIconFile {
  if (platform === 'darwin') return 'trayTemplate.png';
  return darkColors ? 'tray-on-dark.png' : 'tray-on-light.png';
}

export interface TrayIconLocation {
  readonly isPackaged: boolean;
  /** `process.resourcesPath`: the folder next to `app.asar` in a packaged app. */
  readonly resourcesPath: string;
  /** `app.getAppPath()`: the repository root in development. */
  readonly appPath: string;
}

export function trayIconDir(location: TrayIconLocation): string {
  return location.isPackaged
    ? join(location.resourcesPath, TRAY_ICON_DIR_NAME)
    : join(location.appPath, 'resources', TRAY_ICON_DIR_NAME);
}
