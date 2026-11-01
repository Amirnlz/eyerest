import { useEffect } from 'react';
import type { EyerestApi } from '../../shared/ipc';
import type { SoundPlayer } from '../sound/audio-player';

export type CueSource = Pick<EyerestApi, 'onCue'>;

/** Plays the cues main pushes. Without a player it does nothing, so tests and the gallery stay silent. */
export function useSoundCues(source: CueSource, player: SoundPlayer | undefined): void {
  useEffect(() => {
    if (player === undefined) return undefined;
    return source.onCue((cue) => player.play(cue));
  }, [source, player]);
}
