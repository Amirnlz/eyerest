import { describe, expect, it } from 'vitest';
import { DimLayerManager } from '../../src/main/dim/dim-layer-manager';
import { OverlayWindowManager } from '../../src/main/overlay/overlay-window-manager';
import { createMainRuntime } from '../../src/main/runtime';
import { IPC } from '../../src/shared/ipc';
import { FakeDimDisplays, FakeDimWindowFactory } from '../helpers/fake-dim';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeDisplays, FakeWindowFactory } from '../helpers/fake-overlay';
import { FakeTime } from '../helpers/fake-time';

const SEC = 1_000;

/** Fast mode: work 20 s, warning from 15 s, rest 5 s, postpone 10 s. */
function setup() {
  const time = new FakeTime();
  const ipcMain = createFakeIpcMain();
  const dimFactory = new FakeDimWindowFactory();
  const overlayFactory = new FakeWindowFactory();
  const overlay = new OverlayWindowManager(overlayFactory, new FakeDisplays());
  const dim = new DimLayerManager(
    dimFactory,
    new FakeDimDisplays([
      { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      { id: 2, bounds: { x: 1920, y: 0, width: 1280, height: 1024 } },
    ]),
    { onShown: () => overlay.raise() },
  );

  const runtime = createMainRuntime({
    env: { EYEREST_FAST: '1' },
    ipcMain,
    getTargets: () => [],
    extraSenders: [overlay, dim],
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
  });
  dim.start();
  overlay.start();
  runtime.start();

  const dimVisible = () => dimFactory.windows.map((window) => window.visible);
  return { time, ipcMain, dimFactory, overlayFactory, dim, runtime, dimVisible };
}

describe('runtime + dim layer', () => {
  it('stays hidden while working and during the warning', () => {
    const { time, dimVisible } = setup();
    time.advance(14 * SEC);
    expect(dimVisible()).toEqual([false, false]);
    time.advance(5 * SEC);
    expect(dimVisible()).toEqual([false, false]);
  });

  it('dims every display when the rest starts', () => {
    const { time, dimVisible } = setup();
    time.advance(20 * SEC);
    expect(dimVisible()).toEqual([true, true]);
  });

  it('undims when the rest ends', () => {
    const { time, dimVisible } = setup();
    time.advance(25 * SEC);
    expect(dimVisible()).toEqual([false, false]);
  });

  it('undims immediately on skip', () => {
    const { time, ipcMain, dimVisible } = setup();
    time.advance(20 * SEC);
    ipcMain.emit(IPC.skip.channel);
    expect(dimVisible()).toEqual([false, false]);
  });

  it('undims immediately on postpone, and dims again at the next rest', () => {
    const { time, ipcMain, dimVisible } = setup();
    time.advance(20 * SEC);
    ipcMain.emit(IPC.postpone.channel);
    expect(dimVisible()).toEqual([false, false]);

    time.advance(10 * SEC);
    expect(dimVisible()).toEqual([true, true]);
  });

  it('raises the overlay once when the rest starts, so the dim never covers it', () => {
    const { time, overlayFactory } = setup();
    time.advance(20 * SEC);
    expect(overlayFactory.last.count('moveTop')).toBe(1);
    expect(overlayFactory.last.calls.indexOf('setInteractive(true)')).toBeLessThan(
      overlayFactory.last.calls.indexOf('moveTop'),
    );
    time.advance(3 * SEC);
    expect(overlayFactory.last.count('moveTop')).toBe(1);
  });

  it('does not raise the overlay during the warning', () => {
    const { time, overlayFactory } = setup();
    time.advance(17 * SEC);
    expect(overlayFactory.last.count('moveTop')).toBe(0);
  });

  it('destroys all dim windows when disposed', () => {
    const { time, dim, dimFactory } = setup();
    time.advance(20 * SEC);
    dim.dispose();
    expect(dimFactory.live).toHaveLength(0);
  });

  it('uses two windows for the whole session', () => {
    const { time, dimFactory } = setup();
    time.advance(120 * SEC);
    expect(dimFactory.windows).toHaveLength(2);
  });
});
