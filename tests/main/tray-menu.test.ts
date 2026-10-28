import { describe, expect, it } from 'vitest';
import { TRAY_COPY, buildTrayMenu, statusText } from '../../src/main/tray/tray-menu';
import { IDLE, WORKING, resting, warning } from '../helpers/fake-api';

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

  it('says paused when idle', () => {
    expect(statusText(IDLE, fmt)).toBe(TRAY_COPY.paused);
  });
});

describe('buildTrayMenu', () => {
  const labels = (model: ReturnType<typeof buildTrayMenu>) =>
    model.items.map((item) => (item.kind === 'separator' ? '---' : item.label));

  it('while working: status, Pause, separator, Quit', () => {
    expect(labels(buildTrayMenu(WORKING, fmt))).toEqual([
      'Next rest at T20000',
      'Pause reminders',
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

  it('when paused: status, Resume, separator, Quit', () => {
    expect(labels(buildTrayMenu(IDLE, fmt))).toEqual(['Paused', 'Resume reminders', '---', 'Quit']);
  });

  it('the status line is disabled; Pause/Resume and Quit are enabled', () => {
    const items = buildTrayMenu(WORKING, fmt).items.flatMap((item) => (item.kind === 'item' ? [item] : []));
    expect(items.map((item) => [item.id, item.enabled])).toEqual([
      ['status', false],
      ['toggle', true],
      ['quit', true],
    ]);
  });

  it('the tooltip carries the app name and the status', () => {
    expect(buildTrayMenu(IDLE, fmt).tooltip).toBe('eyerest: Paused');
  });
});
