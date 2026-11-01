import type { IdleSource } from './ports';

/** The slice of Electron's `powerMonitor` used here. */
export interface PowerMonitorLike {
  getSystemIdleTime(): number;
}

/**
 * `powerMonitor.getSystemIdleTime()` reports whole seconds. Windows, macOS and Linux X11
 * are expected to work. Native Wayland is not documented by Electron: a compositor that
 * cannot say usually reads as 0, which never reaches the threshold, so the feature stays
 * inert there instead of misfiring.
 */
export function createElectronIdleSource(powerMonitor: PowerMonitorLike): IdleSource {
  return { getIdleMs: () => powerMonitor.getSystemIdleTime() * 1_000 };
}
