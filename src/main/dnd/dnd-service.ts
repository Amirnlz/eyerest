import type { DndPort, QuietTarget } from './ports';

/**
 * Owns the do-not-disturb switch. Deliberately in memory only: a switch that survives a restart
 * would silently mute every rest after one forgotten click, so the app always starts with it off.
 * Setting the current value again does nothing. `target` is read lazily because the tray is built
 * before the scheduler exists.
 */
export class DndService implements DndPort {
  private on = false;

  constructor(private readonly target: () => QuietTarget | undefined) {}

  get(): boolean {
    return this.on;
  }

  set(next: boolean): void {
    if (next === this.on) return;
    this.on = next;
    this.target()?.setQuiet(next);
  }
}
