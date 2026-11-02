import type { ShortcutRegistrar } from './ports';

/** The part of Electron's `globalShortcut` the adapter uses. */
export interface GlobalShortcutLike {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
}

/**
 * Thin binding of the registrar port to Electron's `globalShortcut`. No decisions here: the
 * controller decides when to register. Platforms: Windows, macOS and Linux X11 accept it; native
 * Linux Wayland has no global key grab, so the app turns the feature off there instead of calling this.
 */
export function createElectronShortcutRegistrar(shortcuts: GlobalShortcutLike): ShortcutRegistrar {
  return {
    register: (accelerator, handler) => shortcuts.register(accelerator, handler),
    unregister: (accelerator) => shortcuts.unregister(accelerator),
  };
}
