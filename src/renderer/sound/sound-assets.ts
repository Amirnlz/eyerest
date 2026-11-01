import restEnd from '../../../resources/sounds/rest-end.ogg?url';
import restStart from '../../../resources/sounds/rest-start.ogg?url';
import type { SoundCue } from '../../shared/sound';

/** Bundled by Vite from `resources/sounds/`. Replace the files there to change the sounds. */
export const SOUND_URLS: Readonly<Record<SoundCue, string>> = {
  'rest-start': restStart,
  'rest-end': restEnd,
};
