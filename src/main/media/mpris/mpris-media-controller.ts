import type { MediaController, PausedHandle } from '../ports';
import type { MprisBus } from './mpris-bus';

export const MPRIS_PREFIX = 'org.mpris.MediaPlayer2.';

/** Accepts only well-formed MPRIS names: bus data is untrusted input. */
const MPRIS_NAME = /^org\.mpris\.MediaPlayer2\.[A-Za-z0-9_.-]+$/;

/**
 * `playerctld` is a proxy that mirrors another player's state; pausing through
 * it could stop a player that was not playing.
 */
const PROXY_SUFFIXES = ['playerctld'];

export function isPlayerName(name: string): boolean {
  if (!MPRIS_NAME.test(name)) return false;
  return !PROXY_SUFFIXES.includes(name.slice(MPRIS_PREFIX.length));
}

/**
 * Linux adapter: pauses every MPRIS player whose `PlaybackStatus` is `Playing`.
 * Paused and stopped players are left alone, and so is a player that fails
 * mid-way: one broken player never stops the others from being paused.
 * Failing to list the bus rejects, so the caller can log it.
 */
export class MprisMediaController implements MediaController {
  constructor(
    private readonly bus: MprisBus,
    private readonly onPlayerError: (player: string, error: unknown) => void = () => {},
  ) {}

  async pauseIfPlaying(): Promise<PausedHandle | null> {
    const players = (await this.bus.listNames()).filter(isPlayerName);

    const paused: string[] = [];
    await Promise.all(
      players.map(async (player) => {
        try {
          if ((await this.bus.getPlaybackStatus(player)) !== 'Playing') return;
          await this.bus.pause(player);
          paused.push(player);
        } catch (error) {
          this.onPlayerError(player, error);
        }
      }),
    );

    return paused.length > 0 ? { players: paused.sort() } : null;
  }
}
