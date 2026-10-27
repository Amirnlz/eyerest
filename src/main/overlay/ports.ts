import type { Rect } from "./bounds";

/** The part of an Electron `BrowserWindow` the overlay manager uses. */
export interface OverlayWindowPort {
  setBounds(bounds: Rect): void;
  /** Shows the window without taking keyboard focus from the user's app. */
  showInactive(): void;
  hide(): void;
  isDestroyed(): boolean;
  destroy(): void;
}

/** Creates the (initially hidden) overlay window at the given bounds. */
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
