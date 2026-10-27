import type { Snapshot } from '../../core/scheduler';
import type { Phase } from '../../core/state';
import { computeSurfaceBounds, type Rect } from '../overlay/bounds';
import type { SnapshotSender } from '../scheduler-controller';
import type {
  DimDisplay,
  DimDisplayPort,
  DimWindowFactory,
  DimWindowPort,
} from './ports';

export interface DimLayerManagerOptions {
  /** `true` (default): the dim swallows clicks on the apps below. */
  readonly blockClicks?: boolean;
  /**
   * Called after dim windows were put on screen. The composition root uses it
   * to raise the overlay: on Windows and X11 a window shown later sits on top
   * of one shown earlier, so the overlay must be re-raised.
   */
  readonly onShown?: () => void;
  readonly log?: (message: string) => void;
}

/** The dim is on screen only during the rest, never during the warning. */
export function isDimPhase(phase: Phase): boolean {
  return phase === 'resting';
}

/**
 * Owns one dim window per display. Windows are created hidden, reused across
 * rests, and reconciled on display add, remove and resize. Destroyed windows
 * are recreated on the next snapshot or display change.
 * Implements `SnapshotSender`, so it plugs into the same pipeline as the overlay.
 */
export class DimLayerManager implements SnapshotSender {
  private readonly blockClicks: boolean;
  private readonly onShown: () => void;
  private readonly log: (message: string) => void;

  private readonly windows = new Map<number, DimWindowPort>();
  private visible = false;
  private started = false;
  private disposed = false;
  private stopDisplayWatch: (() => void) | null = null;

  constructor(
    private readonly factory: DimWindowFactory,
    private readonly displays: DimDisplayPort,
    options: DimLayerManagerOptions = {},
  ) {
    this.blockClicks = options.blockClicks ?? true;
    this.onShown = options.onShown ?? (() => {});
    this.log = options.log ?? (() => {});
  }

  /** Creates the hidden windows and starts watching displays. Safe to call twice. */
  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.reconcile(this.displays.getDisplays(), false);
    this.stopDisplayWatch = this.displays.onChange(() =>
      this.handleDisplayChange(),
    );
  }

  send(snapshot: Snapshot): void {
    if (this.disposed) return;
    this.start();
    if (isDimPhase(snapshot.state.phase)) this.show();
    else this.hide();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopDisplayWatch?.();
    this.stopDisplayWatch = null;
    for (const window of this.windows.values()) {
      if (!window.isDestroyed()) window.destroy();
    }
    this.windows.clear();
    this.visible = false;
  }

  private show(): void {
    // Bounds are refreshed on display changes only, not on every tick.
    const presented = this.reconcile(this.displays.getDisplays(), false);
    if (this.visible) {
      if (presented > 0) this.onShown();
      return;
    }
    this.visible = true;
    // Nothing was presented by reconcile (we were hidden): present every window.
    for (const [id, window] of this.windows) {
      const display = this.displays.getDisplays().find((d) => d.id === id);
      if (display) this.present(window, display.bounds);
    }
    this.log(`show ${this.windows.size} window(s)`);
    this.onShown();
  }

  private hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.log('hide');
    for (const window of this.windows.values()) {
      if (!window.isDestroyed()) window.hide();
    }
  }

  private handleDisplayChange(): void {
    const presented = this.reconcile(this.displays.getDisplays(), this.visible);
    if (presented > 0) this.onShown();
  }

  private present(window: DimWindowPort, bounds: Rect): void {
    // Mode and bounds first, so the window never flashes in the wrong state.
    window.setInteractive(this.blockClicks);
    window.setBounds(computeSurfaceBounds(bounds));
    window.showInactive();
  }

  /**
   * Makes the window set match the displays. Returns how many windows were
   * put on screen (only while visible).
   */
  private reconcile(
    displays: readonly DimDisplay[],
    refreshBounds: boolean,
  ): number {
    const wanted = new Set(displays.map((display) => display.id));
    for (const [id, window] of this.windows) {
      if (wanted.has(id)) continue;
      if (!window.isDestroyed()) window.destroy();
      this.windows.delete(id);
      this.log(`display ${id} removed`);
    }

    let presented = 0;
    for (const display of displays) {
      const bounds = computeSurfaceBounds(display.bounds);
      const existing = this.windows.get(display.id);
      if (existing && !existing.isDestroyed()) {
        if (this.visible && refreshBounds) existing.setBounds(bounds);
        continue;
      }
      const created = this.factory.create(bounds);
      this.windows.set(display.id, created);
      this.log(`window created for display ${display.id}`);
      if (this.visible) {
        this.present(created, display.bounds);
        presented += 1;
      }
    }
    return presented;
  }
}
