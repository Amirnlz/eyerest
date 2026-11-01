/** The do-not-disturb switch. `set` applies it to the scheduler. */
export interface DndPort {
  get(): boolean;
  set(next: boolean): void;
}

/** The part of the scheduler controller the switch drives. */
export interface QuietTarget {
  setQuiet(quiet: boolean): void;
}
