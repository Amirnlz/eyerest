/**
 * The three D-Bus operations the MPRIS adapter needs. Keeping the surface this
 * small lets tests fake the bus and lets the transport (busctl today) change
 * without touching the pause logic.
 */
export interface MprisBus {
  /** Bus names currently on the session bus (all of them, not only players). */
  listNames(): Promise<readonly string[]>;
  /** `Playing`, `Paused` or `Stopped` for one player. */
  getPlaybackStatus(player: string): Promise<string>;
  pause(player: string): Promise<void>;
}
