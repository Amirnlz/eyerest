import type { MediaController, PausedHandle } from './ports';

/** For platforms without an adapter yet (Windows and macOS until Step 1.7). */
export class NullMediaController implements MediaController {
  pauseIfPlaying(): Promise<PausedHandle | null> {
    return Promise.resolve(null);
  }
}
