import { describe, expect, it, vi } from 'vitest';
import { createAudioPlayer, type AudioLike } from '../../../src/renderer/sound/audio-player';

const URLS = { 'rest-start': '/start.ogg', 'rest-end': '/end.ogg' } as const;

class FakeAudio implements AudioLike {
  currentTime = 7;
  volume = 1;
  preload = '';
  plays = 0;
  playResult: Promise<void> | void = undefined;
  playThrows: Error | null = null;
  constructor(readonly url: string) {}
  play() {
    this.plays += 1;
    if (this.playThrows) throw this.playThrows;
    return this.playResult;
  }
}

function setup() {
  const created: FakeAudio[] = [];
  const log: string[] = [];
  const player = createAudioPlayer({
    urls: URLS,
    createAudio: (url) => {
      const audio = new FakeAudio(url);
      created.push(audio);
      return audio;
    },
    log: (message) => log.push(message),
  });
  const audioFor = (url: string) => {
    const found = created.find((audio) => audio.url === url);
    if (!found) throw new Error(`no audio for ${url}`);
    return found;
  };
  return { player, created, log, audioFor };
}

describe('createAudioPlayer', () => {
  it('preloads one element per cue, from the given urls', () => {
    const { created } = setup();
    expect(created.map((audio) => audio.url).sort()).toEqual(['/end.ogg', '/start.ogg']);
    for (const audio of created) expect(audio.preload).toBe('auto');
  });

  it('plays the right file from the start at the given volume', () => {
    const { player, audioFor } = setup();
    player.play({ cue: 'rest-end', gain: 0.5 });
    const audio = audioFor('/end.ogg');
    expect(audio.plays).toBe(1);
    expect(audio.volume).toBe(0.5);
    expect(audio.currentTime).toBe(0);
    expect(audioFor('/start.ogg').plays).toBe(0);
  });

  it('restarts a cue that is still ringing, with a new volume', () => {
    const { player, audioFor } = setup();
    player.play({ cue: 'rest-start', gain: 1 });
    audioFor('/start.ogg').currentTime = 0.4;
    player.play({ cue: 'rest-start', gain: 0.25 });
    const audio = audioFor('/start.ogg');
    expect(audio.plays).toBe(2);
    expect(audio.currentTime).toBe(0);
    expect(audio.volume).toBe(0.25);
  });

  it('never creates more than one element per cue', () => {
    const { player, created } = setup();
    player.play({ cue: 'rest-end', gain: 1 });
    player.play({ cue: 'rest-end', gain: 1 });
    expect(created).toHaveLength(2);
  });

  it('clamps a gain outside 0 to 1', () => {
    const { player, audioFor } = setup();
    player.play({ cue: 'rest-end', gain: 5 });
    expect(audioFor('/end.ogg').volume).toBe(1);
    player.play({ cue: 'rest-end', gain: -1 });
    expect(audioFor('/end.ogg').volume).toBe(0);
  });

  it('logs and swallows a rejected play() (autoplay refused, file undecodable)', async () => {
    const { player, audioFor, log } = setup();
    audioFor('/end.ogg').playResult = Promise.reject(new Error('NotSupportedError'));
    expect(() => player.play({ cue: 'rest-end', gain: 1 })).not.toThrow();
    await vi.waitFor(() => expect(log).toHaveLength(1));
    expect(log[0]).toContain('rest-end');
    expect(log[0]).toContain('NotSupportedError');
  });

  it('logs and swallows a play() that throws', () => {
    const { player, audioFor, log } = setup();
    audioFor('/start.ogg').playThrows = new Error('boom');
    expect(() => player.play({ cue: 'rest-start', gain: 1 })).not.toThrow();
    expect(log).toEqual([expect.stringContaining('boom')]);
  });

  it('survives an element that cannot be created, then retries on the next cue', () => {
    let fail = true;
    const log: string[] = [];
    const audio = new FakeAudio('/end.ogg');
    const player = createAudioPlayer({
      urls: URLS,
      createAudio: (url) => {
        if (fail) throw new Error('no audio device');
        return url === '/end.ogg' ? audio : new FakeAudio(url);
      },
      log: (message) => log.push(message),
    });
    expect(log).toHaveLength(2);

    expect(() => player.play({ cue: 'rest-end', gain: 1 })).not.toThrow();
    fail = false;
    player.play({ cue: 'rest-end', gain: 1 });
    expect(audio.plays).toBe(1);
  });
});
