import { describe, expect, it, vi } from 'vitest';
import type { EngineEvent } from '../../src/core/state';
import { createBroadcastCueOutput } from '../../src/main/sound/cue-output';
import type { CueOutput } from '../../src/main/sound/ports';
import { SoundCueSender, cueForEvent } from '../../src/main/sound/sound-cue-sender';
import type { WebContentsLike } from '../../src/main/snapshot-sender';
import { IPC } from '../../src/shared/ipc';
import { VOLUME_GAIN, type PlayCue, type SoundPrefs } from '../../src/shared/sound';
import { WORKING } from '../helpers/fake-api';

const started: EngineEvent = { type: 'rest-started', kind: 'eye', endsAt: 5 };
const completed: EngineEvent = { type: 'rest-completed', kind: 'eye' };

function setup(prefs: SoundPrefs = { muted: false, volume: 'medium' }) {
  const state = { prefs };
  const played: PlayCue[] = [];
  const output: CueOutput = { play: (cue) => played.push(cue) };
  const sender = new SoundCueSender({ get: () => state.prefs }, output);
  return { sender, played, state };
}

describe('cueForEvent', () => {
  it('maps a rest start and a completed rest, and nothing else', () => {
    expect(cueForEvent(started)).toBe('rest-start');
    expect(cueForEvent(completed)).toBe('rest-end');
    const silent: EngineEvent[] = [
      { type: 'started' },
      { type: 'stopped' },
      { type: 'warning-started', restAt: 1 },
      { type: 'rest-skipped', kind: 'eye' },
      { type: 'rest-postponed', newRestAt: 9 },
      { type: 'away-started', since: 1 },
      { type: 'away-ended', reset: true },
    ];
    for (const event of silent) expect(cueForEvent(event), event.type).toBeNull();
  });

  it('treats a long rest like an eye rest', () => {
    expect(cueForEvent({ type: 'rest-started', kind: 'long', endsAt: 5 })).toBe('rest-start');
    expect(cueForEvent({ type: 'rest-completed', kind: 'long' })).toBe('rest-end');
  });
});

describe('SoundCueSender', () => {
  it('plays the start cue at the volume gain', () => {
    const { sender, played } = setup({ muted: false, volume: 'high' });
    sender.send(WORKING, [started]);
    expect(played).toEqual([{ cue: 'rest-start', gain: VOLUME_GAIN.high }]);
  });

  it('plays the end cue when the rest runs out', () => {
    const { sender, played } = setup();
    sender.send(WORKING, [completed]);
    expect(played).toEqual([{ cue: 'rest-end', gain: VOLUME_GAIN.medium }]);
  });

  it('is silent for a skipped or postponed rest', () => {
    const { sender, played } = setup();
    sender.send(WORKING, [{ type: 'rest-skipped', kind: 'eye' }]);
    sender.send(WORKING, [{ type: 'rest-postponed', newRestAt: 5 }]);
    expect(played).toEqual([]);
  });

  it('is silent for a countdown-only update and when called without events', () => {
    const { sender, played } = setup();
    sender.send(WORKING, []);
    sender.send(WORKING);
    expect(played).toEqual([]);
  });

  it('sends nothing while muted, whatever the volume', () => {
    const { sender, played } = setup({ muted: true, volume: 'high' });
    sender.send(WORKING, [started, completed]);
    expect(played).toEqual([]);
  });

  it('reads the choices live: unmute and a new volume apply to the next cue', () => {
    const { sender, played, state } = setup({ muted: true, volume: 'low' });
    sender.send(WORKING, [started]);
    state.prefs = { muted: false, volume: 'low' };
    sender.send(WORKING, [started]);
    state.prefs = { muted: false, volume: 'high' };
    sender.send(WORKING, [completed]);
    expect(played).toEqual([
      { cue: 'rest-start', gain: VOLUME_GAIN.low },
      { cue: 'rest-end', gain: VOLUME_GAIN.high },
    ]);
  });
});

describe('createBroadcastCueOutput', () => {
  function target(options: { destroyed?: boolean; throws?: boolean } = {}) {
    const send = vi.fn((_channel: string, ..._args: unknown[]) => {
      if (options.throws) throw new Error('gone');
    });
    const web: WebContentsLike = { isDestroyed: () => options.destroyed ?? false, send };
    return { web, send };
  }

  it('pushes the cue on the play-cue channel to every live renderer', () => {
    const a = target();
    const b = target();
    createBroadcastCueOutput(() => [a.web, b.web]).play({ cue: 'rest-end', gain: 0.5 });
    expect(a.send).toHaveBeenCalledWith(IPC.playCue.channel, { cue: 'rest-end', gain: 0.5 });
    expect(b.send).toHaveBeenCalledWith(IPC.playCue.channel, { cue: 'rest-end', gain: 0.5 });
  });

  it('skips destroyed renderers', () => {
    const dead = target({ destroyed: true });
    createBroadcastCueOutput(() => [dead.web]).play({ cue: 'rest-end', gain: 1 });
    expect(dead.send).not.toHaveBeenCalled();
  });

  it('reports a failing renderer and still reaches the others', () => {
    const bad = target({ throws: true });
    const good = target();
    const onError = vi.fn();
    createBroadcastCueOutput(() => [bad.web, good.web], onError).play({
      cue: 'rest-start',
      gain: 1,
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(good.send).toHaveBeenCalledTimes(1);
  });
});
