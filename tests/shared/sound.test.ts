import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SOUND_PREFS,
  SOUND_CUES,
  SOUND_VOLUMES,
  VOLUME_GAIN,
  isSoundCue,
  isSoundVolume,
  parsePlayCue,
} from '../../src/shared/sound';

describe('sound contract', () => {
  it('has the two cues and three volume steps', () => {
    expect([...SOUND_CUES]).toEqual(['rest-start', 'rest-end']);
    expect([...SOUND_VOLUMES]).toEqual(['low', 'medium', 'high']);
  });

  it('gains rise with the step and stay within 0 to 1', () => {
    expect(VOLUME_GAIN.low).toBeLessThan(VOLUME_GAIN.medium);
    expect(VOLUME_GAIN.medium).toBeLessThan(VOLUME_GAIN.high);
    for (const volume of SOUND_VOLUMES) {
      expect(VOLUME_GAIN[volume]).toBeGreaterThan(0);
      expect(VOLUME_GAIN[volume]).toBeLessThanOrEqual(1);
    }
  });

  it('defaults to sound on at medium', () => {
    expect(DEFAULT_SOUND_PREFS).toEqual({ muted: false, volume: 'medium' });
  });

  it('recognizes only known cues and volumes', () => {
    expect(isSoundCue('rest-end')).toBe(true);
    expect(isSoundCue('REST-END')).toBe(false);
    expect(isSoundCue(undefined)).toBe(false);
    expect(isSoundVolume('high')).toBe(true);
    expect(isSoundVolume('loud')).toBe(false);
  });
});

describe('parsePlayCue', () => {
  it('accepts a well-formed cue and the gain ends 0 and 1', () => {
    expect(parsePlayCue({ cue: 'rest-start', gain: 0 })).toEqual({ cue: 'rest-start', gain: 0 });
    expect(parsePlayCue({ cue: 'rest-end', gain: 1 })).toEqual({ cue: 'rest-end', gain: 1 });
  });

  it('drops extra keys', () => {
    expect(parsePlayCue({ cue: 'rest-end', gain: 0.5, url: 'http://x' })).toEqual({
      cue: 'rest-end',
      gain: 0.5,
    });
  });

  it.each([
    undefined,
    null,
    'rest-end',
    42,
    [],
    {},
    { cue: 'rest-end' },
    { gain: 0.5 },
    { cue: 'nope', gain: 0.5 },
    { cue: 'rest-end', gain: '0.5' },
    { cue: 'rest-end', gain: 1.01 },
    { cue: 'rest-end', gain: -0.01 },
    { cue: 'rest-end', gain: Number.POSITIVE_INFINITY },
  ])('rejects %j', (value) => {
    expect(parsePlayCue(value)).toBeNull();
  });
});
