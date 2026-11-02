import type { ShortcutHints } from '../../shared/shortcuts';

/** The OS-level shortcut table. The Electron adapter is the only real implementation. */
export interface ShortcutRegistrar {
  /** True when the OS accepted the key. False when another app owns it or the OS refuses. May throw. */
  register(accelerator: string, handler: () => void): boolean;
  unregister(accelerator: string): void;
}

/** What a shortcut does: the scheduler controller's intents. */
export interface ShortcutTarget {
  skip(): void;
  postpone(): void;
}

/** Where the registered shortcuts are announced. In the app: a push to every renderer. */
export interface ShortcutHintsOutput {
  push(hints: ShortcutHints): void;
}
