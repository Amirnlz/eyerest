import { describe, expect, it } from 'vitest';
import { BusctlMprisBus, type CommandRunner } from '../../src/main/media/mpris/busctl-mpris-bus';

const SPOTIFY = 'org.mpris.MediaPlayer2.spotify';

function setup(output: string | Error) {
  const calls: { file: string; args: readonly string[]; timeoutMs: number }[] = [];
  const run: CommandRunner = (file, args, timeoutMs) => {
    calls.push({ file, args, timeoutMs });
    return output instanceof Error ? Promise.reject(output) : Promise.resolve(output);
  };
  return { calls, bus: new BusctlMprisBus(run) };
}

describe('BusctlMprisBus', () => {
  it('lists names from busctl JSON', async () => {
    const { bus, calls } = setup('{"type":"as","data":[["org.freedesktop.DBus",":1.0","org.mpris.MediaPlayer2.vlc"]]}\n');

    expect(await bus.listNames()).toEqual([
      'org.freedesktop.DBus',
      ':1.0',
      'org.mpris.MediaPlayer2.vlc',
    ]);
    expect(calls[0]?.file).toBe('busctl');
    expect(calls[0]?.args).toEqual([
      '--user',
      '--no-pager',
      '--json=short',
      'call',
      'org.freedesktop.DBus',
      '/org/freedesktop/DBus',
      'org.freedesktop.DBus',
      'ListNames',
    ]);
  });

  it('reads PlaybackStatus', async () => {
    const { bus, calls } = setup('{"type":"s","data":"Playing"}');

    expect(await bus.getPlaybackStatus(SPOTIFY)).toBe('Playing');
    expect(calls[0]?.args).toEqual([
      '--user',
      '--no-pager',
      '--json=short',
      'get-property',
      SPOTIFY,
      '/org/mpris/MediaPlayer2',
      'org.mpris.MediaPlayer2.Player',
      'PlaybackStatus',
    ]);
  });

  it('calls Pause without JSON output', async () => {
    const { bus, calls } = setup('');
    await bus.pause(SPOTIFY);
    expect(calls[0]?.args).toEqual([
      '--user',
      '--no-pager',
      'call',
      SPOTIFY,
      '/org/mpris/MediaPlayer2',
      'org.mpris.MediaPlayer2.Player',
      'Pause',
    ]);
  });

  it('every command has a timeout', async () => {
    const { bus, calls } = setup('{"type":"s","data":"Paused"}');
    await bus.getPlaybackStatus(SPOTIFY);
    expect(calls[0]?.timeoutMs).toBeGreaterThan(0);
  });

  it('rejects when busctl is missing or fails', async () => {
    const { bus } = setup(new Error('spawn busctl ENOENT'));
    await expect(bus.listNames()).rejects.toThrow('ENOENT');
  });

  it.each(['not json', '{"type":"as","data":[]}', '{"type":"as","data":[[1,2]]}', 'null'])(
    'rejects malformed ListNames output: %s',
    async (output) => {
      await expect(setup(output).bus.listNames()).rejects.toThrow();
    },
  );

  it.each(['{"type":"s"}', '{"type":"s","data":5}', ''])(
    'rejects malformed PlaybackStatus output: %s',
    async (output) => {
      await expect(setup(output).bus.getPlaybackStatus(SPOTIFY)).rejects.toThrow();
    },
  );

  it('refuses names that are not MPRIS players, so nothing reads as an option', async () => {
    const { bus, calls } = setup('');
    await expect(bus.pause('--help')).rejects.toThrow('not an MPRIS player');
    await expect(bus.getPlaybackStatus(':1.5')).rejects.toThrow('not an MPRIS player');
    expect(calls).toHaveLength(0);
  });
});
