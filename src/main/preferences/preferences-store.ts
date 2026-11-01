import { dirname } from 'node:path';
import type { SoundPrefs } from '../../shared/sound';
import type { SettingsFs } from '../settings/settings';
import type { SoundPrefsPort } from '../sound/ports';
import { DEFAULT_PREFERENCES, parsePreferences, serializePreferences, type Preferences } from './preferences';

/**
 * All person-level choices in one `preferences.json` next to `settings.json`. One store owns the
 * file, so two features can never overwrite each other's keys. Loads once, keeps the answer in
 * memory, and writes atomically (temp file, then rename). A bad file or a failed write is logged
 * and never throws, so a preference can never stop the app.
 */
export class PreferencesStore {
  private current: Preferences = DEFAULT_PREFERENCES;

  constructor(
    private readonly fs: SettingsFs,
    private readonly path: string,
    private readonly log: (message: string) => void = () => undefined,
  ) {
    this.current = this.load();
  }

  get(): Preferences {
    return this.current;
  }

  /** The change applies at once, even if saving it fails. */
  update(patch: Partial<Preferences>): void {
    this.current = { ...this.current, ...patch };
    const temp = `${this.path}.tmp`;
    try {
      this.fs.ensureDir(dirname(this.path));
      this.fs.writeFile(temp, serializePreferences(this.current));
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

  private load(): Preferences {
    let text: string | null;
    try {
      text = this.fs.readFile(this.path);
    } catch (error) {
      this.log(`could not read ${this.path}, using defaults: ${String(error)}`);
      return DEFAULT_PREFERENCES;
    }
    if (text === null) return DEFAULT_PREFERENCES;
    const result = parsePreferences(text);
    for (const issue of result.issues) this.log(`${this.path}: ${issue}`);
    return result.prefs;
  }
}

/** The sound part of the store, as the port the tray and the cue sender use. */
export function soundPrefsView(store: PreferencesStore): SoundPrefsPort {
  return {
    get: () => store.get().sound,
    set: (next: SoundPrefs) => store.update({ sound: { muted: next.muted, volume: next.volume } }),
  };
}
