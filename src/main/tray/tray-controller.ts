import type { Snapshot } from '../../core/scheduler';
import type { SnapshotSender } from '../scheduler-controller';
import { buildTrayMenu, type TrayItemId, type TrayMenuModel } from './tray-menu';

/** The part of Electron's `Tray` the controller uses. */
export interface TrayPort {
  /** Replaces the menu and tooltip. `onSelect` is called with the clicked item's id. */
  setMenu(model: TrayMenuModel, onSelect: (id: TrayItemId) => void): void;
  destroy(): void;
}

export interface TrayActions {
  pause(): void;
  resume(): void;
  openSettings(): void;
  quit(): void;
}

export function formatClockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Keeps the tray menu in step with the scheduler and turns menu clicks into
 * actions. A `SnapshotSender`, so it plugs into the same pipeline as the
 * overlay, the dim layer and the media pauser.
 *
 * It holds no scheduling state: Pause and Resume go through `actions`, and the
 * resulting idle or working snapshot comes back through `send`.
 */
export class TrayController implements SnapshotSender {
  private lastModelKey: string | null = null;
  private lastPhase: Snapshot['state']['phase'] | null = null;
  private disposed = false;

  constructor(
    private readonly tray: TrayPort,
    private readonly actions: TrayActions,
    private readonly formatTime: (epochMs: number) => string = formatClockTime,
  ) {}

  send(snapshot: Snapshot): void {
    if (this.disposed) return;
    this.lastPhase = snapshot.state.phase;

    const model = buildTrayMenu(snapshot, this.formatTime);
    // Snapshots arrive every second during the warning and rest; only touch
    // the real tray when something visible changed.
    const key = JSON.stringify(model);
    if (key === this.lastModelKey) return;
    this.lastModelKey = key;
    this.tray.setMenu(model, (id) => this.handle(id));
  }

  /** Runs a menu action. Ignored after dispose and before the first snapshot. */
  handle(id: TrayItemId): void {
    if (this.disposed) return;
    switch (id) {
      case 'toggle':
        if (this.lastPhase === null) return;
        if (this.lastPhase === 'idle') this.actions.resume();
        else this.actions.pause();
        return;
      case 'settings':
        this.actions.openSettings();
        return;
      case 'quit':
        this.actions.quit();
        return;
      case 'status':
        return;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.tray.destroy();
  }
}
