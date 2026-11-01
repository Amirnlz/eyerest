/** Where the OS idle time comes from. The Electron adapter is the only real implementation. */
export interface IdleSource {
  /** Milliseconds since the last keyboard or pointer input. May throw if the OS cannot say. */
  getIdleMs(): number;
}
