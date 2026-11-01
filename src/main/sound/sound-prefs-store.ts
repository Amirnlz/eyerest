import { dirname } from 'node:path';
import { DEFAULT_SOUND_PREFS, type SoundPrefs } from '../../shared/sound';
import type { SettingsFs } from '../settings/settings';
import type { SoundPrefsPort } from './ports';
import { parseSoundPrefs, serializeSoundPrefs } from './sound-prefs';

/**
 * Sound choices in `preferences.json` next to `settings.json`. Kept apart from the rest settings:
 * that file holds only the validated timing config. Loads once, keeps the answer in memory, and
 * writes atomically (temp file, then rename). A bad file or a failed write is logged and never
 * throws, so a sound preference can never stop the app.
 */
export class SoundPrefsStore implements SoundPrefsPort {
  private current: SoundPrefs = DEFAULT_SOUND_PREFS;

  constructor(
    private readonly fs: SettingsFs,
    private readonly path: string,
    private readonly log: (message: string) => void = () => undefined,
  ) {
    this.current = this.load();
  }

  get(): SoundPrefs {
    return this.current;
  }

  /** The new value applies at once, even if saving it fails. */
  set(next: SoundPrefs): void {
    this.current = { muted: next.muted, volume: next.volume };
    const temp = `${this.path}.tmp`;
    try {
      this.fs.ensureDir(dirname(this.path));
      this.fs.writeFile(temp, serializeSoundPrefs(this.current));
      this.fs.rename(temp, this.path);
    } catch (error) {
      this.log(`could not save ${this.path}: ${String(error)}`);
      try {
        this.fs.remove(temp);
      } catch {
        // Only a leftover temp file; the save error above matters more.
      }
    }
  }

  private load(): SoundPrefs {
    let text: string | null;
    try {
      text = this.fs.readFile(this.path);
    } catch (error) {
      this.log(`could not read ${this.path}, using defaults: ${String(error)}`);
      return DEFAULT_SOUND_PREFS;
    }
    if (text === null) return DEFAULT_SOUND_PREFS;
    const result = parseSoundPrefs(text);
    for (const issue of result.issues) this.log(`${this.path}: ${issue}`);
    return result.prefs;
  }
}
