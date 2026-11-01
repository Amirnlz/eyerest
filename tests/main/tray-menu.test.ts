import { describe, expect, it } from 'vitest';
import { TRAY_COPY, buildTrayMenu, statusText, themeOfItem, volumeOfItem } from '../../src/main/tray/tray-menu';
import { AWAY, IDLE, WORKING, resting, warning } from '../helpers/fake-api';

const fmt = (epochMs: number) => `T${epochMs}`;

describe('statusText', () => {
  it('shows the next rest time while working', () => {
    expect(statusText(WORKING, fmt)).toBe('Next rest at T20000');
  });

  it('shows no countdown during the warning (the menu would flicker)', () => {
    expect(statusText(warning(12), fmt)).toBe(TRAY_COPY.warning);
    expect(statusText(warning(3), fmt)).toBe(TRAY_COPY.warning);
  });

  it('distinguishes an eye rest from a long rest, with no countdown', () => {
    expect(statusText(resting(18), fmt)).toBe(TRAY_COPY.resting);
    expect(statusText(resting(590, 'long'), fmt)).toBe(TRAY_COPY.restingLong);
  });

  it('says the timer is paused while the person is away', () => {
    expect(statusText(AWAY, fmt)).toBe(TRAY_COPY.away);
  });

  it('says paused when idle', () => {
    expect(statusText(IDLE, fmt)).toBe(TRAY_COPY.paused);
  });
});

describe('buildTrayMenu while away', () => {
  it('still offers Pause: reminders are running, only the countdown is frozen', () => {
    const model = buildTrayMenu(AWAY, fmt);
    const toggle = model.items.find((item) => item.kind === 'item' && item.id === 'toggle');
    expect(toggle).toMatchObject({ label: TRAY_COPY.pause, enabled: true });
    expect(model.tooltip).toBe(`${TRAY_COPY.appName}: ${TRAY_COPY.away}`);
  });
});

describe('buildTrayMenu', () => {
  const labels = (model: ReturnType<typeof buildTrayMenu>) =>
    model.items.map((item) => (item.kind === 'separator' ? '---' : item.label));

  it('while working: status, Pause, Settings, separator, Quit', () => {
    expect(labels(buildTrayMenu(WORKING, fmt))).toEqual([
      'Next rest at T20000',
      'Pause reminders',
      'Settings',
      '---',
      'Quit',
    ]);
  });

  it.each([
    ['warning', warning(10)],
    ['resting', resting(10)],
  ])('offers Pause during the %s', (_phase, snapshot) => {
    expect(labels(buildTrayMenu(snapshot, fmt))[1]).toBe('Pause reminders');
  });

  it('when paused: status, Resume, Settings, separator, Quit', () => {
    expect(labels(buildTrayMenu(IDLE, fmt))).toEqual([
      'Paused',
      'Resume reminders',
      'Settings',
      '---',
      'Quit',
    ]);
  });

  it('the status line is disabled; Pause/Resume and Quit are enabled', () => {
    const items = buildTrayMenu(WORKING, fmt).items.flatMap((item) => (item.kind === 'item' ? [item] : []));
    expect(items.map((item) => [item.id, item.enabled])).toEqual([
      ['status', false],
      ['toggle', true],
      ['settings', true],
      ['quit', true],
    ]);
  });

  it('the tooltip carries the app name and the status', () => {
    expect(buildTrayMenu(IDLE, fmt).tooltip).toBe('eyerest: Paused');
  });
});

describe('buildTrayMenu launch at login', () => {
  const item = (model: ReturnType<typeof buildTrayMenu>) =>
    model.items.find((entry) => entry.kind === 'item' && entry.id === 'autostart');

  it('has no such item by default or when unsupported', () => {
    expect(item(buildTrayMenu(WORKING, fmt))).toBeUndefined();
    expect(item(buildTrayMenu(WORKING, fmt, { supported: false }))).toBeUndefined();
  });

  it.each([true, false])('is a checkbox item reflecting enabled=%s', (enabled) => {
    const model = buildTrayMenu(WORKING, fmt, { supported: true, enabled });
    expect(item(model)).toEqual({
      kind: 'item',
      id: 'autostart',
      label: TRAY_COPY.launchAtLogin,
      enabled: true,
      checked: enabled,
    });
  });

  it('sits right after Settings and before the separator and Quit', () => {
    const model = buildTrayMenu(WORKING, fmt, { supported: true, enabled: false });
    expect(model.items.map((entry) => (entry.kind === 'separator' ? '---' : entry.id))).toEqual([
      'status',
      'toggle',
      'settings',
      'autostart',
      '---',
      'quit',
    ]);
  });

  it('is offered in every phase, including paused and away', () => {
    for (const snapshot of [IDLE, AWAY, warning(10), resting(10)]) {
      expect(item(buildTrayMenu(snapshot, fmt, { supported: true, enabled: true }))).toBeDefined();
    }
  });
});

describe('buildTrayMenu sound items', () => {
  const find = (model: ReturnType<typeof buildTrayMenu>, id: string) =>
    model.items.find((entry) => entry.kind === 'item' && entry.id === id);
  const submenu = (model: ReturnType<typeof buildTrayMenu>) =>
    model.items.find((entry) => entry.kind === 'submenu');

  it('has no sound items unless the sound prefs are wired', () => {
    const model = buildTrayMenu(WORKING, fmt);
    expect(find(model, 'mute')).toBeUndefined();
    expect(submenu(model)).toBeUndefined();
  });

  it.each([true, false])('has a mute checkbox reflecting muted=%s', (muted) => {
    const model = buildTrayMenu(WORKING, fmt, undefined, { muted, volume: 'medium' });
    expect(find(model, 'mute')).toEqual({
      kind: 'item',
      id: 'mute',
      label: TRAY_COPY.muteSounds,
      enabled: true,
      checked: muted,
    });
  });

  it('has a volume submenu of three radio items with exactly the current one checked', () => {
    const model = buildTrayMenu(WORKING, fmt, undefined, { muted: false, volume: 'high' });
    const menu = submenu(model);
    expect(menu?.kind).toBe('submenu');
    if (menu?.kind !== 'submenu') return;
    expect(menu.label).toBe(TRAY_COPY.soundVolume);
    expect(
      menu.items.map((entry) =>
        entry.kind === 'item' ? [entry.id, entry.label, entry.checked, entry.radio] : null,
      ),
    ).toEqual([
      ['volume-low', 'Low', false, true],
      ['volume-medium', 'Medium', false, true],
      ['volume-high', 'High', true, true],
    ]);
  });

  it('keeps the volume choice visible while muted', () => {
    const model = buildTrayMenu(WORKING, fmt, undefined, { muted: true, volume: 'low' });
    const menu = submenu(model);
    const checked = menu?.kind === 'submenu'
      ? menu.items.filter((entry) => entry.kind === 'item' && entry.checked)
      : [];
    expect(checked).toHaveLength(1);
  });

  it('sits after Launch at login and before the separator and Quit', () => {
    const model = buildTrayMenu(WORKING, fmt, { supported: true, enabled: false }, {
      muted: false,
      volume: 'medium',
    });
    expect(
      model.items.map((entry) =>
        entry.kind === 'separator' ? '---' : entry.kind === 'submenu' ? 'volume' : entry.id,
      ),
    ).toEqual(['status', 'toggle', 'settings', 'autostart', 'mute', 'volume', '---', 'quit']);
  });

  it('is offered in every phase', () => {
    for (const snapshot of [IDLE, AWAY, warning(10), resting(10)]) {
      expect(find(buildTrayMenu(snapshot, fmt, undefined, { muted: false, volume: 'low' }), 'mute')).toBeDefined();
    }
  });
});

describe('volumeOfItem', () => {
  it('maps the three volume ids and nothing else', () => {
    expect(volumeOfItem('volume-low')).toBe('low');
    expect(volumeOfItem('volume-medium')).toBe('medium');
    expect(volumeOfItem('volume-high')).toBe('high');
    for (const id of ['status', 'toggle', 'settings', 'autostart', 'mute', 'quit'] as const) {
      expect(volumeOfItem(id)).toBeNull();
    }
  });
});

describe('buildTrayMenu theme submenu', () => {
  const themeMenu = (model: ReturnType<typeof buildTrayMenu>) =>
    model.items.find((entry) => entry.kind === 'submenu' && entry.label === TRAY_COPY.theme);

  it('is absent unless the theme is wired', () => {
    expect(themeMenu(buildTrayMenu(WORKING, fmt))).toBeUndefined();
  });

  it.each(['system', 'light', 'dark'] as const)(
    'has three radio items with only %s checked',
    (theme) => {
      const menu = themeMenu(buildTrayMenu(WORKING, fmt, undefined, null, theme));
      expect(menu?.kind).toBe('submenu');
      if (menu?.kind !== 'submenu') return;
      expect(
        menu.items.map((entry) =>
          entry.kind === 'item' ? [entry.id, entry.label, entry.checked, entry.radio] : null,
        ),
      ).toEqual([
        ['theme-system', 'System', theme === 'system', true],
        ['theme-light', 'Light', theme === 'light', true],
        ['theme-dark', 'Dark', theme === 'dark', true],
      ]);
    },
  );

  it('sits after the sound items and before the separator and Quit', () => {
    const model = buildTrayMenu(
      WORKING,
      fmt,
      { supported: true, enabled: false },
      { muted: false, volume: 'medium' },
      'system',
    );
    expect(
      model.items.map((entry) =>
        entry.kind === 'separator' ? '---' : entry.kind === 'submenu' ? entry.label : entry.id,
      ),
    ).toEqual([
      'status',
      'toggle',
      'settings',
      'autostart',
      'mute',
      'Sound volume',
      'Theme',
      '---',
      'quit',
    ]);
  });

  it('is offered in every phase', () => {
    for (const snapshot of [IDLE, AWAY, warning(10), resting(10)]) {
      expect(themeMenu(buildTrayMenu(snapshot, fmt, undefined, null, 'dark'))).toBeDefined();
    }
  });
});

describe('themeOfItem', () => {
  it('maps the three theme ids and nothing else', () => {
    expect(themeOfItem('theme-system')).toBe('system');
    expect(themeOfItem('theme-light')).toBe('light');
    expect(themeOfItem('theme-dark')).toBe('dark');
    for (const id of ['status', 'toggle', 'settings', 'autostart', 'mute', 'volume-low', 'quit'] as const) {
      expect(themeOfItem(id)).toBeNull();
    }
  });
});

describe('buildTrayMenu eye exercises item', () => {
  const find = (model: ReturnType<typeof buildTrayMenu>) =>
    model.items.find((entry) => entry.kind === 'item' && entry.id === 'exercises');

  it('is absent unless wired', () => {
    expect(find(buildTrayMenu(WORKING, fmt))).toBeUndefined();
  });

  it.each([true, false])('is a checkbox that is checked=%s', (enabled) => {
    const model = buildTrayMenu(WORKING, fmt, undefined, null, null, enabled);
    expect(find(model)).toEqual({
      kind: 'item',
      id: 'exercises',
      label: 'Eye exercises',
      enabled: true,
      checked: enabled,
    });
  });

  it('sits after Theme and before the separator', () => {
    const model = buildTrayMenu(WORKING, fmt, undefined, null, 'system', true);
    const ids = model.items.map((entry) =>
      entry.kind === 'separator' ? '---' : entry.kind === 'submenu' ? entry.label : entry.id,
    );
    expect(ids).toEqual(['status', 'toggle', 'settings', 'Theme', 'exercises', '---', 'quit']);
  });
});

describe('buildTrayMenu do not disturb item', () => {
  const find = (model: ReturnType<typeof buildTrayMenu>) =>
    model.items.find((entry) => entry.kind === 'item' && entry.id === 'dnd');

  it('is absent unless wired', () => {
    expect(find(buildTrayMenu(WORKING, fmt))).toBeUndefined();
  });

  it.each([true, false])('is a checkbox that is checked=%s', (on) => {
    const model = buildTrayMenu(WORKING, fmt, undefined, null, null, null, on);
    expect(find(model)).toEqual({
      kind: 'item',
      id: 'dnd',
      label: 'Do not disturb',
      enabled: true,
      checked: on,
    });
  });

  it('replaces the next rest time while working, since that rest will be skipped', () => {
    expect(buildTrayMenu(WORKING, fmt, undefined, null, null, null, true).items[0]).toMatchObject({
      label: TRAY_COPY.doNotDisturbStatus,
    });
    expect(buildTrayMenu(WORKING, fmt, undefined, null, null, null, false).items[0]).toMatchObject({
      label: 'Next rest at T20000',
    });
    expect(statusText(WORKING, fmt, true)).toBe(TRAY_COPY.doNotDisturbStatus);
  });

  it('keeps Paused when paused, whatever the switch says', () => {
    expect(statusText(IDLE, fmt, true)).toBe(TRAY_COPY.paused);
  });

  it('sits after Theme and before Eye exercises', () => {
    const model = buildTrayMenu(WORKING, fmt, undefined, null, 'system', true, true);
    const ids = model.items.map((entry) =>
      entry.kind === 'separator' ? '---' : entry.kind === 'submenu' ? entry.label : entry.id,
    );
    expect(ids).toEqual(['status', 'toggle', 'settings', 'Theme', 'dnd', 'exercises', '---', 'quit']);
  });
});
