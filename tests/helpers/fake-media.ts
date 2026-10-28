import type { MediaController, PausedHandle } from '../../src/main/media/ports';
import type { MprisBus } from '../../src/main/media/mpris/mpris-bus';

export class FakeMediaController implements MediaController {
  calls = 0;
  result: PausedHandle | null = null;
  /** Set to make the next call reject. */
  rejectWith: unknown = undefined;
  /** Set to make the next call throw synchronously. */
  throwWith: unknown = undefined;

  pauseIfPlaying(): Promise<PausedHandle | null> {
    this.calls += 1;
    if (this.throwWith !== undefined) throw this.throwWith;
    if (this.rejectWith !== undefined) return Promise.reject(this.rejectWith);
    return Promise.resolve(this.result);
  }
}

export interface FakePlayer {
  status: string;
  /** Make `getPlaybackStatus` reject for this player. */
  statusFails?: boolean;
  /** Make `pause` reject for this player. */
  pauseFails?: boolean;
}

/** An in-memory session bus with MPRIS players. */
export class FakeMprisBus implements MprisBus {
  readonly paused: string[] = [];
  names: string[];
  listFails = false;

  constructor(readonly players: Record<string, FakePlayer> = {}, extraNames: string[] = []) {
    this.names = [...extraNames, ...Object.keys(players)];
  }

  listNames(): Promise<readonly string[]> {
    return this.listFails ? Promise.reject(new Error('no bus')) : Promise.resolve(this.names);
  }

  getPlaybackStatus(player: string): Promise<string> {
    const entry = this.players[player];
    if (!entry || entry.statusFails) return Promise.reject(new Error(`status ${player}`));
    return Promise.resolve(entry.status);
  }

  pause(player: string): Promise<void> {
    const entry = this.players[player];
    if (!entry || entry.pauseFails) return Promise.reject(new Error(`pause ${player}`));
    this.paused.push(player);
    entry.status = 'Paused';
    return Promise.resolve();
  }
}
