import { join } from 'node:path/posix';
import type { SettingsFs } from '../settings/settings';
import type { AutostartPort } from './ports';

/** The file operations the adapter needs. `SettingsFs` already satisfies it. */
export type DesktopFileFs = Pick<SettingsFs, 'readFile' | 'writeFile' | 'remove' | 'ensureDir'>;

export const AUTOSTART_FILE_NAME = 'eyerest.desktop';

/**
 * The program to launch. An AppImage mounts itself at a temporary path, so `process.execPath`
 * would be dead after a reboot: the `APPIMAGE` variable holds the real file. A deb install
 * runs from a stable path, where `execPath` is right.
 */
export function resolveLinuxExec(
  env: Readonly<Record<string, string | undefined>>,
  execPath: string,
): string {
  const appImage = env['APPIMAGE'];
  return appImage !== undefined && appImage !== '' ? appImage : execPath;
}

/** Quotes a path for the `Exec` key: double quotes, with `"`, `` ` ``, `$`, `\` and `%` escaped. */
export function quoteExec(path: string): string {
  return `"${path.replace(/["`$\\]/g, '\\$&').replace(/%/g, '%%')}"`;
}

export function buildDesktopEntry(execPath: string): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=eyerest',
    'Comment=Reminds you to rest your eyes',
    `Exec=${quoteExec(execPath)}`,
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n');
}

/** A desktop entry the user disabled in their session settings counts as off. */
export function isDesktopEntryEnabled(text: string): boolean {
  const lines = text.split('\n').map((line) => line.trim());
  return !lines.includes('Hidden=true') && !lines.includes('X-GNOME-Autostart-enabled=false');
}

export interface LinuxAutostartOptions {
  readonly fs: DesktopFileFs;
  /** `$XDG_CONFIG_HOME` or `~/.config`. The entry goes in its `autostart` folder. */
  readonly configHome: string;
  readonly execPath: string;
}

/** XDG autostart: a `.desktop` file in `<config>/autostart`. Honoured by GNOME, KDE, Xfce and others. */
export function createLinuxDesktopAutostart(options: LinuxAutostartOptions): AutostartPort {
  const dir = join(options.configHome, 'autostart');
  const file = join(dir, AUTOSTART_FILE_NAME);
  return {
    getState() {
      const text = options.fs.readFile(file);
      return { supported: true, enabled: text !== null && isDesktopEntryEnabled(text) };
    },
    setEnabled(enabled) {
      if (enabled) {
        options.fs.ensureDir(dir);
        options.fs.writeFile(file, buildDesktopEntry(options.execPath));
      } else {
        options.fs.remove(file);
      }
    },
  };
}
