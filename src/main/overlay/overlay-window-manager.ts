import type { Snapshot } from "../../core/scheduler";
import type { Phase } from "../../core/state";
import type { SnapshotSender } from "../scheduler-controller";
import {
  DEFAULT_OVERLAY_MARGIN,
  DEFAULT_OVERLAY_SIZE,
  computeOverlayBounds,
  type Rect,
  type Size,
} from "./bounds";
import type {
  DisplayPort,
  OverlayWindowFactory,
  OverlayWindowPort,
} from "./ports";

export interface OverlayWindowManagerOptions {
  readonly size?: Size;
  readonly margin?: number;
}

/** Phases in which the overlay is on screen. */
export function isOverlayPhase(phase: Phase): boolean {
  return phase === "warning" || phase === "resting";
}

/**
 * Owns the overlay window: shows it on warning and rest, hides it otherwise,
 * and keeps it in the top-right corner of the primary display.
 *
 * - One window is created up front (hidden) and reused for every rest, so
 *   showing it is instant. If the OS or the user destroys it, the next show
 *   creates a new one.
 * - Bounds are recomputed when the overlay is shown and whenever the displays
 *   change while it is visible.
 * - Implements `SnapshotSender`, so it plugs into the same pipeline as the
 *   renderer broadcast.
 */
export class OverlayWindowManager implements SnapshotSender {
  private readonly size: Size;
  private readonly margin: number;

  private window: OverlayWindowPort | null = null;
  private shown = false;
  private started = false;
  private disposed = false;
  private stopDisplayWatch: (() => void) | null = null;

  constructor(
    private readonly factory: OverlayWindowFactory,
    private readonly displays: DisplayPort,
    options: OverlayWindowManagerOptions = {},
  ) {
    this.size = options.size ?? DEFAULT_OVERLAY_SIZE;
    this.margin = options.margin ?? DEFAULT_OVERLAY_MARGIN;
  }

  /** Creates the hidden window and starts watching displays. Safe to call twice. */
  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.ensureWindow();
    this.stopDisplayWatch = this.displays.onChange(() =>
      this.handleDisplayChange(),
    );
  }

  send(snapshot: Snapshot): void {
    if (this.disposed) return;
    this.start();
    this.setVisible(isOverlayPhase(snapshot.state.phase));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopDisplayWatch?.();
    this.stopDisplayWatch = null;
    if (this.window && !this.window.isDestroyed()) this.window.destroy();
    this.window = null;
    this.shown = false;
  }

  private setVisible(visible: boolean): void {
    if (visible) {
      const window = this.ensureWindow();
      if (this.shown) return;
      window.setBounds(this.currentBounds());
      window.showInactive();
      this.shown = true;
      return;
    }

    if (!this.shown) return;
    this.shown = false;
    if (this.window && !this.window.isDestroyed()) this.window.hide();
  }

  private handleDisplayChange(): void {
    if (!this.shown || !this.window || this.window.isDestroyed()) return;
    this.window.setBounds(this.currentBounds());
  }

  /** Returns a live window, creating a new one if there is none or it was destroyed. */
  private ensureWindow(): OverlayWindowPort {
    if (this.window && !this.window.isDestroyed()) return this.window;
    this.window = this.factory.create(this.currentBounds());
    this.shown = false;
    return this.window;
  }

  private currentBounds(): Rect {
    return computeOverlayBounds(
      this.displays.getPrimaryWorkArea(),
      this.size,
      this.margin,
    );
  }
}
