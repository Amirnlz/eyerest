import { AUTOSTART_UNSUPPORTED, type AutostartPort } from './ports';
import { createLoginItemAutostart, type LoginItemApp } from './login-item-autostart';
import {
  createLinuxDesktopAutostart,
  resolveLinuxExec,
  type DesktopFileFs,
} from './linux-desktop-autostart';

export interface CreateAutostartDeps {
  readonly platform: NodeJS.Platform;
  /** Only a packaged build registers itself: a dev run would register the bare Electron binary. */
  readonly isPackaged: boolean;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly execPath: string;
  readonly loginItemApp: LoginItemApp;
  readonly fs: DesktopFileFs;
  readonly configHome: string;
}

const UNSUPPORTED: AutostartPort = {
  getState: () => AUTOSTART_UNSUPPORTED,
  setEnabled: () => undefined,
};

/** Picks the adapter for the platform. Unsupported cases return a port that reports so. */
export function createAutostart(deps: CreateAutostartDeps): AutostartPort {
  if (!deps.isPackaged) return UNSUPPORTED;
  switch (deps.platform) {
    case 'win32':
    case 'darwin':
      return createLoginItemAutostart(deps.loginItemApp);
    case 'linux':
      return createLinuxDesktopAutostart({
        fs: deps.fs,
        configHome: deps.configHome,
        execPath: resolveLinuxExec(deps.env, deps.execPath),
      });
    default:
      return UNSUPPORTED;
  }
}
