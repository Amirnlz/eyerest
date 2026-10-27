import type { Snapshot } from '../../core/scheduler';
import type { Phase } from '../../core/state';
import {
  OVERLAY_MARGIN,
  OVERLAY_SIZE,
  type OverlayLayout,
} from '../../shared/overlay-layout';
import type { SnapshotSender } from '../scheduler-controller';
import {
  computeOverlayBounds,
  computeSurfaceBounds,
  type Rect,
  type Size,
} from './bounds';
import type {
  DisplayPort,
  OverlayWindowFactory,
  OverlayWindowPort,
} from './ports';

export interface OverlayWindowManagerOptions {
  /** `positioned` (default): small top-right window. `surface`: whole work area. */
  readonly layout?: OverlayLayout;
  readonly size?: Size;
  readonly margin?: number;
  /** Optional diagnostics, e.g. `console.info` when `EYEREST_DEBUG=1`. */
  readonly log?: (message: string) => void;
}

/** Phases in which the overlay is on screen. */
export function isOverlayPhase(phase: Phase): boolean {
  return phase === 'warning' || phase === 'resting';
}

/** Only the rest has buttons; the warning lets clicks through. */
export function isInteractivePhase(phase: Phase): boolean {
  return phase === 'resting';
}

/**
 * Owns the overlay window: shows it on warning and rest, hides it otherwise.
 *
 * - One window is created up front (hidden) and reused for every rest, so
 *   showing it is instant. If the OS, the user or a renderer crash destroys
 *   it, the next snapshot creates a new one.
 * - Layout `positioned`: a small window in the top-right of the primary
 *   display's work area. Layout `surface`: a window covering the work area;
 *   the renderer draws the panel at the top-right. Bounds are recomputed when
 *   the overlay is shown and whenever the displays change while it is visible.
 * - The warning is click-through; the rest receives clicks.
 * - Implements `SnapshotSender`, so it plugs into the same pipeline as the
 *   renderer broadcast.
 */
export class OverlayWindowManager implements SnapshotSender {
  private readonly layout: OverlayLayout;
  private readonly size: Size;
  private readonly margin: number;
  private readonly log: (message: string) => void;

  private window: OverlayWindowPort | null = null;
  private shown = false;
  private interactive = false;
  private started = false;
  private disposed = false;
  private stopDisplayWatch: (() => void) | null = null;

  constructor(
    private readonly factory: OverlayWindowFactory,
    private readonly displays: DisplayPort,
    options: OverlayWindowManagerOptions = {},
  ) {
    this.layout = options.layout ?? 'positioned';
    this.size = options.size ?? OVERLAY_SIZE;
    this.margin = options.margin ?? OVERLAY_MARGIN;
    this.log = options.log ?? (() => {});
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

    const phase = snapshot.state.phase;
    if (isOverlayPhase(phase)) {
      this.show(isInteractivePhase(phase));
    } else {
      this.hide();
    }
  }

  /**
   * Raises the visible overlay above other windows. Called after the dim
   * layer is shown: on Windows and X11 the most recently shown window wins
   * within a level, and the dim must never cover the Skip and Postpone buttons.
   */
  raise(): void {
    if (this.disposed || !this.shown) return;
    if (!this.window || this.window.isDestroyed()) return;
    this.window.moveTop();
    this.log('raised');
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopDisplayWatch?.();
    this.stopDisplayWatch = null;
    if (this.window && !this.window.isDestroyed()) this.window.destroy();
    this.window = null;
    this.shown = false;
    this.interactive = false;
  }

  private show(interactive: boolean): void {
    const window = this.ensureWindow();

    // Set before showing, so the window never flashes in the wrong mode.
    if (interactive !== this.interactive) {
      window.setInteractive(interactive);
      this.interactive = interactive;
      this.log(`interactive=${interactive}`);
    }

    if (this.shown) return;
    const bounds = this.currentBounds();
    window.setBounds(bounds);
    window.showInactive();
    this.shown = true;
    this.log(`show ${JSON.stringify(bounds)}`);
  }

  private hide(): void {
    if (!this.shown) return;
    this.log('hide');
    this.shown = false;

    const window = this.window;
    if (!window || window.isDestroyed()) return;
    window.hide();
    if (this.interactive) {
      window.setInteractive(false);
      this.interactive = false;
    }
  }

  private handleDisplayChange(): void {
    if (!this.shown || !this.window || this.window.isDestroyed()) return;
    const bounds = this.currentBounds();
    this.window.setBounds(bounds);
    this.log(`display changed, moved to ${JSON.stringify(bounds)}`);
  }

  /** Returns a live window, creating a new one if there is none or it was destroyed. */
  private ensureWindow(): OverlayWindowPort {
    if (this.window && !this.window.isDestroyed()) return this.window;
    const bounds = this.currentBounds();
    this.window = this.factory.create(bounds);
    this.shown = false;
    this.interactive = false;
    this.log(`window created (${this.layout}) ${JSON.stringify(bounds)}`);
    return this.window;
  }

  private currentBounds(): Rect {
    const workArea = this.displays.getPrimaryWorkArea();
    return this.layout === 'surface'
      ? computeSurfaceBounds(workArea)
      : computeOverlayBounds(workArea, this.size, this.margin);
  }
}
