import { Menu, Tray, nativeImage, type MenuItemConstructorOptions } from 'electron';
import { TRAY_ICON_DATA_URL, TRAY_ICON_SCALE_FACTOR } from './tray-icon';
import type { TrayPort } from './tray-controller';

/**
 * Thin Electron bindings for the tray port. All decisions live in
 * `TrayController` and `buildTrayMenu`; this file only renders the model, so it
 * is covered by manual checks instead of unit tests.
 */
export function createElectronTrayPort(): TrayPort {
  const icon = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL);
  const tray = new Tray(
    nativeImage.createFromBuffer(icon.toPNG(), { scaleFactor: TRAY_ICON_SCALE_FACTOR }),
  );

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
      if (!tray.isDestroyed()) tray.destroy();
    },
  };
}
