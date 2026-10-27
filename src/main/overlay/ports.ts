import type { Rect } from './bounds';

/** The part of an Electron `BrowserWindow` the overlay manager uses. */
export interface OverlayWindowPort {
  setBounds(bounds: Rect): void;
  /** Shows the window without taking keyboard focus from the user's app. */
  showInactive(): void;
  hide(): void;
  /**
   * `false`: clicks pass through the window to the apps below (the warning).
   * `true`: the window receives clicks (the rest, with its buttons).
   * A new window starts click-through.
   */
  setInteractive(interactive: boolean): void;
  isDestroyed(): boolean;
  destroy(): void;
}

/** Creates the (initially hidden, click-through) overlay window at the given bounds. */
export interface OverlayWindowFactory {
  create(bounds: Rect): OverlayWindowPort;
}

/** The part of Electron's `screen` the overlay manager uses. */
export interface DisplayPort {
  /** Work area of the primary display, in device-independent pixels. */
  getPrimaryWorkArea(): Rect;
  /** Calls the listener when displays are added, removed or resized. */
  onChange(listener: () => void): () => void;
}
