import type { Snapshot } from '../../core/scheduler';

/**
 * Tray copy. English only until localization (Phase 4); kept in one object so
 * that step swaps one file.
 */
export const TRAY_COPY = {
  appName: 'eyerest',
  paused: 'Paused',
  warning: 'Rest starting soon',
  resting: 'Resting',
  restingLong: 'Long rest in progress',
  pause: 'Pause reminders',
  resume: 'Resume reminders',
  settings: 'Settings',
  quit: 'Quit',
  nextRest: (time: string) => `Next rest at ${time}`,
} as const;

export type TrayItemId = 'status' | 'toggle' | 'settings' | 'quit';

export type TrayMenuItem =
  | { readonly kind: 'item'; readonly id: TrayItemId; readonly label: string; readonly enabled: boolean }
  | { readonly kind: 'separator' };

/** Everything the tray shows, as plain data. The Electron adapter only renders it. */
export interface TrayMenuModel {
  readonly tooltip: string;
  readonly items: readonly TrayMenuItem[];
}

/**
 * Status line for the tray. The warning and the rest show no seconds on
 * purpose: a menu that rebuilds every second flickers while it is open.
 */
export function statusText(snapshot: Snapshot, formatTime: (epochMs: number) => string): string {
  const { state } = snapshot;
  switch (state.phase) {
    case 'idle':
      return TRAY_COPY.paused;
    case 'working':
      return TRAY_COPY.nextRest(formatTime(state.restAt));
    case 'warning':
      return TRAY_COPY.warning;
    case 'resting':
      return state.kind === 'long' ? TRAY_COPY.restingLong : TRAY_COPY.resting;
  }
}

/**
 * Menu per scheduler state: status, Pause or Resume, Settings, Quit. The scheduler is idle exactly when reminders are
 * paused (it starts at launch), so idle shows Resume and every other phase
 * shows Pause.
 */
export function buildTrayMenu(
  snapshot: Snapshot,
  formatTime: (epochMs: number) => string,
): TrayMenuModel {
  const status = statusText(snapshot, formatTime);
  const paused = snapshot.state.phase === 'idle';
  return {
    tooltip: `${TRAY_COPY.appName}: ${status}`,
    items: [
      { kind: 'item', id: 'status', label: status, enabled: false },
      { kind: 'item', id: 'toggle', label: paused ? TRAY_COPY.resume : TRAY_COPY.pause, enabled: true },
      { kind: 'item', id: 'settings', label: TRAY_COPY.settings, enabled: true },
      { kind: 'separator' },
      { kind: 'item', id: 'quit', label: TRAY_COPY.quit, enabled: true },
    ],
  };
}
