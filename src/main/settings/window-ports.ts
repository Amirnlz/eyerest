/** The part of an Electron `BrowserWindow` the settings window manager uses. */
export interface SettingsWindowPort {
  /** Brings an already open window to the front: restores it if minimized, shows it, focuses it. */
  focus(): void;
  /** Calls the listener once, when the window is closed by the user or by `close()`. */
  onClosed(listener: () => void): void;
  /** Closes the window. */
  close(): void;
  isDestroyed(): boolean;
}

/** Creates the settings window. A new window shows itself once its page is ready to paint. */
export interface SettingsWindowFactory {
  create(): SettingsWindowPort;
}
