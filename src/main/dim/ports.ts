import type { Rect } from '../overlay/bounds';

/** The part of an Electron `BrowserWindow` the dim layer uses. */
export interface DimWindowPort {
  setBounds(bounds: Rect): void;
  /** Shows the window (fading in) without taking keyboard focus. */
  showInactive(): void;
  /** Hides the window immediately. */
  hide(): void;
  /**
   * `true`: the window swallows clicks (the dim blocks the apps below).
   * `false`: clicks pass through. A new window starts click-through.
   */
  setInteractive(interactive: boolean): void;
  isDestroyed(): boolean;
  destroy(): void;
}

/** Creates the (initially hidden, click-through) dim window at the given bounds. */
export interface DimWindowFactory {
  create(bounds: Rect): DimWindowPort;
}

export interface DimDisplay {
  readonly id: number;
  /** Full display bounds (not the work area), in device-independent pixels. */
  readonly bounds: Rect;
}

/** The part of Electron's `screen` the dim layer uses. */
export interface DimDisplayPort {
  getDisplays(): readonly DimDisplay[];
  /** Calls the listener when displays are added, removed or resized. */
  onChange(listener: () => void): () => void;
}
