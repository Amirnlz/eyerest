import { describe, expect, it, vi } from 'vitest';
import {
  MprisMediaController,
  isPlayerName,
} from '../../src/main/media/mpris/mpris-media-controller';
import { FakeMprisBus } from '../helpers/fake-media';

const SPOTIFY = 'org.mpris.MediaPlayer2.spotify';
const FIREFOX = 'org.mpris.MediaPlayer2.firefox.instance_1_42';
const VLC = 'org.mpris.MediaPlayer2.vlc';

describe('isPlayerName', () => {
  it.each([
    [SPOTIFY, true],
    [FIREFOX, true],
    ['org.mpris.MediaPlayer2.chromium.instance123', true],
    ['org.mpris.MediaPlayer2.playerctld', false],
    ['org.mpris.MediaPlayer2.', false],
    ['org.freedesktop.DBus', false],
    [':1.42', false],
    ['--help', false],
    ['org.mpris.MediaPlayer2.bad name', false],
    ['org.mpris.MediaPlayer2.x;rm', false],
  ])('%s -> %s', (name, expected) => {
    expect(isPlayerName(name)).toBe(expected);
  });
});

describe('MprisMediaController', () => {
  it('pauses a playing player and reports it', async () => {
    const bus = new FakeMprisBus({ [SPOTIFY]: { status: 'Playing' } });
    const handle = await new MprisMediaController(bus).pauseIfPlaying();

    expect(bus.paused).toEqual([SPOTIFY]);
    expect(handle).toEqual({ players: [SPOTIFY] });
  });

  it('pauses only the playing ones among several', async () => {
    const bus = new FakeMprisBus({
      [SPOTIFY]: { status: 'Playing' },
      [FIREFOX]: { status: 'Paused' },
      [VLC]: { status: 'Stopped' },
    });
    const handle = await new MprisMediaController(bus).pauseIfPlaying();

    expect(bus.paused).toEqual([SPOTIFY]);
    expect(handle?.players).toEqual([SPOTIFY]);
  });

  it('pauses every playing player', async () => {
    const bus = new FakeMprisBus({
      [SPOTIFY]: { status: 'Playing' },
      [FIREFOX]: { status: 'Playing' },
    });
    const handle = await new MprisMediaController(bus).pauseIfPlaying();

    expect([...bus.paused].sort()).toEqual([FIREFOX, SPOTIFY].sort());
    expect(handle?.players).toEqual([FIREFOX, SPOTIFY].sort());
  });

  it('ignores paused and stopped players: resolves null and pauses nothing', async () => {
    const bus = new FakeMprisBus({
      [SPOTIFY]: { status: 'Paused' },
      [VLC]: { status: 'Stopped' },
    });
    expect(await new MprisMediaController(bus).pauseIfPlaying()).toBeNull();
    expect(bus.paused).toEqual([]);
  });

  it('handles zero players', async () => {
    const bus = new FakeMprisBus({}, ['org.freedesktop.DBus', ':1.1']);
    expect(await new MprisMediaController(bus).pauseIfPlaying()).toBeNull();
  });

  it('ignores non-player bus names and the playerctld proxy', async () => {
    const bus = new FakeMprisBus(
      { 'org.mpris.MediaPlayer2.playerctld': { status: 'Playing' } },
      ['org.freedesktop.DBus', ':1.7'],
    );
    expect(await new MprisMediaController(bus).pauseIfPlaying()).toBeNull();
    expect(bus.paused).toEqual([]);
  });

  it('rejects when the bus cannot be listed', async () => {
    const bus = new FakeMprisBus({ [SPOTIFY]: { status: 'Playing' } });
    bus.listFails = true;
    await expect(new MprisMediaController(bus).pauseIfPlaying()).rejects.toThrow('no bus');
  });

  it('a player that fails to answer does not stop the others', async () => {
    const onPlayerError = vi.fn();
    const bus = new FakeMprisBus({
      [FIREFOX]: { status: 'Playing', statusFails: true },
      [SPOTIFY]: { status: 'Playing' },
    });
    const handle = await new MprisMediaController(bus, onPlayerError).pauseIfPlaying();

    expect(handle?.players).toEqual([SPOTIFY]);
    expect(onPlayerError).toHaveBeenCalledWith(FIREFOX, expect.any(Error));
  });

  it('a failed pause is not reported as paused', async () => {
    const onPlayerError = vi.fn();
    const bus = new FakeMprisBus({ [SPOTIFY]: { status: 'Playing', pauseFails: true } });
    const handle = await new MprisMediaController(bus, onPlayerError).pauseIfPlaying();

    expect(handle).toBeNull();
    expect(onPlayerError).toHaveBeenCalledTimes(1);
  });
});
