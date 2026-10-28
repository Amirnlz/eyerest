import { describe, expect, it } from 'vitest';
import type { RestConfig } from '../../src/core/config';
import { DimLayerManager } from '../../src/main/dim/dim-layer-manager';
import { OverlayWindowManager } from '../../src/main/overlay/overlay-window-manager';
import { createMainRuntime } from '../../src/main/runtime';
import { TrayController } from '../../src/main/tray/tray-controller';
import { FakeDimDisplays, FakeDimWindowFactory } from '../helpers/fake-dim';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeTray } from '../helpers/fake-lifecycle';
import { FakeDisplays, FakeWindowFactory } from '../helpers/fake-overlay';
import { FakeTime } from '../helpers/fake-time';

const SEC = 1_000;

/** Fast mode: work 20 s, warning from 15 s, rest 5 s, postpone 10 s. */
function setup(settingsOverrides: Partial<RestConfig> = {}) {
  const time = new FakeTime();
  const overlayFactory = new FakeWindowFactory();
  const dimFactory = new FakeDimWindowFactory();
  const overlay = new OverlayWindowManager(overlayFactory, new FakeDisplays());
  const dim = new DimLayerManager(dimFactory, new FakeDimDisplays());
  const fakeTray = new FakeTray();

  let runtime: ReturnType<typeof createMainRuntime> | null = null;
  const tray = new TrayController(
    fakeTray,
    {
      pause: () => runtime?.controller.pause(),
      resume: () => runtime?.controller.resume(),
      quit: () => {},
    },
    (ms) => `T${ms}`,
  );

  runtime = createMainRuntime({
    env: { EYEREST_FAST: '1' },
    settingsOverrides,
    ipcMain: createFakeIpcMain(),
    getTargets: () => [],
    extraSenders: [dim, overlay, tray],
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
  });
  dim.start();
  overlay.start();
  runtime.start();

  return {
    time,
    runtime,
    fakeTray,
    overlayWindow: () => overlayFactory.last,
    dimWindow: () => dimFactory.window(0),
  };
}

describe('pause and resume through the tray', () => {
  it('shows the working menu at launch', () => {
    const { fakeTray } = setup();
    expect(fakeTray.labels).toEqual(['Next rest at T20000', 'Pause reminders', 'Quit']);
  });

  it('Pause during the rest hides the overlay and the dim layer at once', () => {
    const { time, fakeTray, overlayWindow, dimWindow } = setup();
    time.advance(20 * SEC);
    expect(overlayWindow().visible).toBe(true);
    expect(dimWindow().visible).toBe(true);

    fakeTray.click('toggle');

    expect(overlayWindow().visible).toBe(false);
    expect(dimWindow().visible).toBe(false);
    expect(fakeTray.labels).toEqual(['Paused', 'Resume reminders', 'Quit']);
  });

  it('Pause during the warning hides the overlay', () => {
    const { time, fakeTray, overlayWindow } = setup();
    time.advance(17 * SEC);
    expect(overlayWindow().visible).toBe(true);

    fakeTray.click('toggle');

    expect(overlayWindow().visible).toBe(false);
  });

  it('nothing appears while paused, however long it lasts', () => {
    const { time, fakeTray, overlayWindow, dimWindow, runtime } = setup();
    fakeTray.click('toggle');
    time.advance(120 * SEC);

    expect(runtime.controller.getSnapshot().state.phase).toBe('idle');
    expect(overlayWindow().visible).toBe(false);
    expect(dimWindow().visible).toBe(false);
  });

  it('Resume restarts the cycle: a full work interval from the moment of resume', () => {
    const { time, fakeTray, overlayWindow, runtime } = setup();
    time.advance(10 * SEC);
    fakeTray.click('toggle');
    time.advance(60 * SEC);
    fakeTray.click('toggle');

    expect(runtime.controller.getSnapshot().state.phase).toBe('working');
    expect(fakeTray.labels[0]).toBe('Next rest at T90000');

    time.advance(14 * SEC);
    expect(overlayWindow().visible).toBe(false);
    time.advance(1 * SEC);
    expect(overlayWindow().visible).toBe(true);
  });

  it('Resume after a pause during a rest starts with work, not the rest', () => {
    const { time, fakeTray, runtime } = setup();
    time.advance(20 * SEC);
    fakeTray.click('toggle');
    fakeTray.click('toggle');
    expect(runtime.controller.getSnapshot().state.phase).toBe('working');
  });

  it('keeps one ticker: pause stops it, resume starts exactly one', () => {
    const { time, fakeTray } = setup();
    expect(time.activeTickers).toBe(1);
    fakeTray.click('toggle');
    expect(time.activeTickers).toBe(0);
    fakeTray.click('toggle');
    expect(time.activeTickers).toBe(1);
  });
});

describe('settings overrides in the runtime', () => {
  it('uses a settings value that fast mode does not set', () => {
    const { runtime, time } = setup({ cyclesBeforeLongRest: 1 });
    time.advance(20 * SEC);
    const state = runtime.controller.getSnapshot().state;
    expect(state.phase === 'resting' && state.kind).toBe('long');
  });
});
