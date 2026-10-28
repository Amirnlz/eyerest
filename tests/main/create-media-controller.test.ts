import { describe, expect, it } from 'vitest';
import { createMediaController } from '../../src/main/media/create-media-controller';
import { MprisMediaController } from '../../src/main/media/mpris/mpris-media-controller';
import { NullMediaController } from '../../src/main/media/null-media-controller';

describe('createMediaController', () => {
  it('uses MPRIS on Linux', () => {
    expect(createMediaController('linux')).toBeInstanceOf(MprisMediaController);
  });

  it.each(['win32', 'darwin', 'freebsd'] as const)(
    'uses the null controller on %s until its adapter exists',
    (platform) => {
      expect(createMediaController(platform)).toBeInstanceOf(NullMediaController);
    },
  );
});

describe('NullMediaController', () => {
  it('resolves null and never rejects', async () => {
    expect(await new NullMediaController().pauseIfPlaying()).toBeNull();
  });
});
