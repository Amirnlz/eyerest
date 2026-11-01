import { describe, expect, it } from 'vitest';
import { TRAY_COPY, buildTrayMenu, statusText } from '../../src/main/tray/tray-menu';
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
