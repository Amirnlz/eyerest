import { execFile } from 'node:child_process';
import type { MprisBus } from './mpris-bus';
import { MPRIS_PREFIX } from './mpris-media-controller';

/** Runs a program with arguments (no shell) and resolves its stdout. */
export type CommandRunner = (
  file: string,
  args: readonly string[],
  timeoutMs: number,
) => Promise<string>;

export const execFileRunner: CommandRunner = (file, args, timeoutMs) =>
  new Promise((resolve, reject) => {
    execFile(file, [...args], { timeout: timeoutMs, windowsHide: true }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });

const COMMAND_TIMEOUT_MS = 2_000;
const OBJECT = '/org/mpris/MediaPlayer2';
const PLAYER_INTERFACE = 'org.mpris.MediaPlayer2.Player';

/**
 * `busctl` talks to the session bus without a native module or an npm
 * dependency. It ships with systemd (v240+ for `--json=short`). Where it is
 * missing the command fails and the pause is skipped (and logged).
 */
export class BusctlMprisBus implements MprisBus {
  constructor(private readonly run: CommandRunner = execFileRunner) {}

  async listNames(): Promise<readonly string[]> {
    const out = await this.busctl([
      'call',
      'org.freedesktop.DBus',
      '/org/freedesktop/DBus',
      'org.freedesktop.DBus',
      'ListNames',
    ]);
    const data = parseJson(out).data;
    const names: unknown = Array.isArray(data) ? data[0] : undefined;
    if (!Array.isArray(names) || !names.every((n) => typeof n === 'string')) {
      throw new Error('unexpected ListNames output');
    }
    return names as string[];
  }

  async getPlaybackStatus(player: string): Promise<string> {
    assertPlayer(player);
    const out = await this.busctl([
      'get-property',
      player,
      OBJECT,
      PLAYER_INTERFACE,
      'PlaybackStatus',
    ]);
    const data = parseJson(out).data;
    if (typeof data !== 'string') throw new Error('unexpected PlaybackStatus output');
    return data;
  }

  async pause(player: string): Promise<void> {
    assertPlayer(player);
    await this.busctl(['call', player, OBJECT, PLAYER_INTERFACE, 'Pause'], false);
  }

  private busctl(args: readonly string[], json = true): Promise<string> {
    const base = ['--user', '--no-pager', ...(json ? ['--json=short'] : [])];
    return this.run('busctl', [...base, ...args], COMMAND_TIMEOUT_MS);
  }
}

function assertPlayer(player: string): void {
  // Also guarantees the name cannot be read as a command-line option.
  if (!player.startsWith(MPRIS_PREFIX)) throw new Error(`not an MPRIS player: ${player}`);
}

function parseJson(out: string): { data?: unknown } {
  const parsed: unknown = JSON.parse(out);
  if (typeof parsed !== 'object' || parsed === null) throw new Error('unexpected busctl output');
  return parsed as { data?: unknown };
}
