/** Records which players a pause call stopped, so a later feature can resume them. */
export interface PausedHandle {
  /** Platform-specific player identifiers, e.g. MPRIS bus names on Linux. */
  readonly players: readonly string[];
}

/**
 * Pauses whatever media is currently playing. Adapters per platform; the
 * scheduler side only ever sees this port.
 */
export interface MediaController {
  /**
   * Pauses every player that is playing right now and leaves the rest alone.
   * Resolves `null` when nothing was playing or the platform is unsupported.
   * May reject when the platform's media bus is unreachable; callers log that.
   */
  pauseIfPlaying(): Promise<PausedHandle | null>;
}
