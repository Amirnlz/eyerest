import { Menu, Tray, nativeImage, nativeTheme, type MenuItemConstructorOptions } from 'electron';
import { join } from 'node:path';
import { selectTrayIconFile } from './tray-icon';
import type { TrayPort } from './tray-controller';

export interface ElectronTrayOptions {
  /** Folder holding the tray icon files (see `trayIconDir`). */
  readonly iconDir: string;
}

/**
 * Thin Electron bindings for the tray port. All decisions live in
 * `TrayController`, `buildTrayMenu` and `selectTrayIconFile`; this file only renders the model,
 * so it is covered by manual checks instead of unit tests.
 */
export function createElectronTrayPort(options: ElectronTrayOptions): TrayPort {
  // createFromPath loads the `@2x` sibling by itself.
  const loadIcon = () =>
    nativeImage.createFromPath(
      join(options.iconDir, selectTrayIconFile(process.platform, nativeTheme.shouldUseDarkColors)),
    );

  const initial = loadIcon();
  if (initial.isEmpty()) {
    console.error(`[tray] icon missing or unreadable in ${options.iconDir}`);
  }
  const tray = new Tray(initial);

  // macOS recolors the template image itself. Elsewhere the file follows the OS color setting.
  const followTheme = process.platform !== 'darwin';
  const onThemeChange = (): void => {
    if (!tray.isDestroyed()) tray.setImage(loadIcon());
  };
  if (followTheme) nativeTheme.on('updated', onThemeChange);

  return {
    setMenu(model, onSelect) {
      const template: MenuItemConstructorOptions[] = model.items.map((item) =>
        item.kind === 'separator'
          ? { type: 'separator' }
          : { label: item.label, enabled: item.enabled, click: () => onSelect(item.id) },
      );
      tray.setToolTip(model.tooltip);
      tray.setContextMenu(Menu.buildFromTemplate(template));
    },
    destroy() {
      if (followTheme) nativeTheme.removeListener('updated', onThemeChange);
      if (!tray.isDestroyed()) tray.destroy();
    },
  };
}
