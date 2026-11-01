import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SOUND_CUES } from '../../src/shared/sound';

const DIR = join(__dirname, '../../resources/sounds');

/**
 * The files are bundled by Vite and cannot be loaded here, so this guards what can go wrong
 * when someone swaps them: a missing file, the wrong format, or a file that bloats the app.
 */
describe.each(SOUND_CUES)('resources/sounds/%s.ogg', (cue) => {
  const file = join(DIR, `${cue}.ogg`);

  it('exists', () => {
    expect(() => statSync(file)).not.toThrow();
  });

  it('is an Ogg file (a renamed WAV or MP3 fails here)', () => {
    expect(readFileSync(file).subarray(0, 4).toString('latin1')).toBe('OggS');
  });

  it('is small: under 150 KB', () => {
    expect(statSync(file).size).toBeLessThan(150 * 1024);
  });

  it('is not empty', () => {
    expect(statSync(file).size).toBeGreaterThan(1024);
  });
});
