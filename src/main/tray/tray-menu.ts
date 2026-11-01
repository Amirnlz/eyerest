import type { Snapshot } from '../../core/scheduler';
import { AUTOSTART_UNSUPPORTED, type AutostartState } from '../autostart/ports';
import { SOUND_VOLUMES, type SoundPrefs, type SoundVolume } from '../../shared/sound';
import { themePreferences, type ThemePreference } from '../../shared/theme';

/**
 * Tray copy. English only until localization (Phase 4); kept in one object so
 * that step swaps one file.
 */
export const TRAY_COPY = {
  appName: 'eyerest',
  paused: 'Paused',
  away: 'Away: timer paused',
  warning: 'Rest starting soon',
  resting: 'Resting',
  restingLong: 'Long rest in progress',
  pause: 'Pause reminders',
  resume: 'Resume reminders',
  settings: 'Settings',
  launchAtLogin: 'Launch at login',
  muteSounds: 'Mute sounds',
  soundVolume: 'Sound volume',
  volume: { low: 'Low', medium: 'Medium', high: 'High' } satisfies Record<SoundVolume, string>,
  theme: 'Theme',
  themeNames: { system: 'System', light: 'Light', dark: 'Dark' } satisfies Record<ThemePreference, string>,
  quit: 'Quit',
  nextRest: (time: string) => `Next rest at ${time}`,
} as const;

export type VolumeItemId = `volume-${SoundVolume}`;
export type ThemeItemId = `theme-${ThemePreference}`;

export type TrayItemId =
  | 'status'
  | 'toggle'
  | 'settings'
  | 'autostart'
  | 'mute'
  | VolumeItemId
  | ThemeItemId
  | 'quit';

/** The theme a tray item id stands for, or null for any other id. */
export function themeOfItem(id: TrayItemId): ThemePreference | null {
  return themePreferences.find((preference) => `theme-${preference}` === id) ?? null;
}

/** The volume step a tray item id stands for, or null for any other id. */
export function volumeOfItem(id: TrayItemId): SoundVolume | null {
  return SOUND_VOLUMES.find((volume) => `volume-${volume}` === id) ?? null;
}

export type TrayMenuItem =
  | {
      readonly kind: 'item';
      readonly id: TrayItemId;
      readonly label: string;
      readonly enabled: boolean;
      /** Present on checkbox and radio items. */
      readonly checked?: boolean;
      /** With `checked`: a radio item (one of a group) instead of a checkbox. */
      readonly radio?: true;
    }
  | { readonly kind: 'submenu'; readonly label: string; readonly items: readonly TrayMenuItem[] }
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
    case 'away':
      return TRAY_COPY.away;
    case 'working':
      return TRAY_COPY.nextRest(formatTime(state.restAt));
    case 'warning':
      return TRAY_COPY.warning;
    case 'resting':
      return state.kind === 'long' ? TRAY_COPY.restingLong : TRAY_COPY.resting;
  }
}

function soundItems(sound: SoundPrefs): TrayMenuItem[] {
  return [
    {
      kind: 'item',
      id: 'mute',
      label: TRAY_COPY.muteSounds,
      enabled: true,
      checked: sound.muted,
    },
    {
      kind: 'submenu',
      label: TRAY_COPY.soundVolume,
      items: SOUND_VOLUMES.map(
        (volume): TrayMenuItem => ({
          kind: 'item',
          id: `volume-${volume}`,
          label: TRAY_COPY.volume[volume],
          enabled: true,
          checked: sound.volume === volume,
          radio: true,
        }),
      ),
    },
  ];
}

function themeMenu(theme: ThemePreference): TrayMenuItem {
  return {
    kind: 'submenu',
    label: TRAY_COPY.theme,
    items: themePreferences.map(
      (preference): TrayMenuItem => ({
        kind: 'item',
        id: `theme-${preference}`,
        label: TRAY_COPY.themeNames[preference],
        enabled: true,
        checked: theme === preference,
        radio: true,
      }),
    ),
  };
}

/**
 * Menu per scheduler state: status, Pause or Resume, Settings, Launch at login (when supported),
 * sound mute and volume and Theme (when wired), Quit. The scheduler is idle exactly when reminders are
 * paused (it starts at launch), so idle shows Resume and every other phase
 * shows Pause.
 */
export function buildTrayMenu(
  snapshot: Snapshot,
  formatTime: (epochMs: number) => string,
  autostart: AutostartState = AUTOSTART_UNSUPPORTED,
  sound: SoundPrefs | null = null,
  theme: ThemePreference | null = null,
): TrayMenuModel {
  const status = statusText(snapshot, formatTime);
  const paused = snapshot.state.phase === 'idle';
  return {
    tooltip: `${TRAY_COPY.appName}: ${status}`,
    items: [
      { kind: 'item', id: 'status', label: status, enabled: false },
      { kind: 'item', id: 'toggle', label: paused ? TRAY_COPY.resume : TRAY_COPY.pause, enabled: true },
      { kind: 'item', id: 'settings', label: TRAY_COPY.settings, enabled: true },
      ...(autostart.supported
        ? [
            {
              kind: 'item',
              id: 'autostart',
              label: TRAY_COPY.launchAtLogin,
              enabled: true,
              checked: autostart.enabled,
            } as const,
          ]
        : []),
      ...(sound === null ? [] : soundItems(sound)),
      ...(theme === null ? [] : [themeMenu(theme)]),
      { kind: 'separator' },
      { kind: 'item', id: 'quit', label: TRAY_COPY.quit, enabled: true },
    ],
  };
}
