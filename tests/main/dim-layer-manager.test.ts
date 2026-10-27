import { describe, expect, it, vi } from 'vitest';
import {
  DimLayerManager,
  isDimPhase,
  type DimLayerManagerOptions,
} from '../../src/main/dim/dim-layer-manager';
import type { DimDisplay } from '../../src/main/dim/ports';
import { IDLE, WORKING, resting, warning } from '../helpers/fake-api';
import { FakeDimDisplays, FakeDimWindowFactory } from '../helpers/fake-dim';

const D1: DimDisplay = { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
const D2: DimDisplay = { id: 2, bounds: { x: 1920, y: 0, width: 2560, height: 1440 } };

function setup(
  displays: readonly DimDisplay[] = [D1],
  options: DimLayerManagerOptions = {},
) {
  const factory = new FakeDimWindowFactory();
  const ports = new FakeDimDisplays(displays);
  const manager = new DimLayerManager(factory, ports, options);
  return { factory, ports, manager };
}

describe('isDimPhase', () => {
  it.each([
    ['idle', false],
    ['working', false],
    ['warning', false],
    ['resting', true],
  ] as const)('%s -> %s', (phase, expected) => {
    expect(isDimPhase(phase)).toBe(expected);
  });
});

describe('DimLayerManager', () => {
  describe('start', () => {
    it('creates one hidden window per display at the display bounds', () => {
      const { factory, manager } = setup([D1, D2]);
      manager.start();

      expect(factory.windows).toHaveLength(2);
      expect(factory.window(0).createdWith).toEqual(D1.bounds);
      expect(factory.window(1).createdWith).toEqual(D2.bounds);
      expect(factory.window(0).calls).toEqual([]);
      expect(factory.window(1).calls).toEqual([]);
    });

    it('is idempotent', () => {
      const { factory, ports, manager } = setup();
      manager.start();
      manager.start();

      expect(factory.windows).toHaveLength(1);
      expect(ports.listenerCount).toBe(1);
    });

    it('is started implicitly by the first snapshot', () => {
      const { factory, manager } = setup();
      manager.send(WORKING);
      expect(factory.windows).toHaveLength(1);
    });

    it('handles zero displays', () => {
      const { factory, manager } = setup([]);
      manager.send(resting(5));
      expect(factory.windows).toHaveLength(0);
    });
  });

  describe('visibility per phase', () => {
    it('stays hidden while idle, working and warning', () => {
      const { factory, manager } = setup();
      manager.send(IDLE);
      manager.send(WORKING);
      manager.send(warning(10));
      expect(factory.window(0).calls).toEqual([]);
    });

    it('shows every window during the rest: mode and bounds first, then show', () => {
      const { factory, manager } = setup([D1, D2]);
      manager.send(resting(20));

      for (const [index, display] of [D1, D2].entries()) {
        const window = factory.window(index);
        expect(window.calls).toEqual([
          'setInteractive(true)',
          'setBounds',
          'showInactive',
        ]);
        expect(window.boundsHistory).toEqual([display.bounds]);
        expect(window.visible).toBe(true);
      }
    });

    it('shows once across the countdown', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      manager.send(resting(19));
      manager.send(resting(18));
      expect(factory.window(0).count('showInactive')).toBe(1);
      expect(factory.window(0).count('setBounds')).toBe(1);
    });

    it('hides when work resumes (rest ended or skipped)', () => {
      const { factory, manager } = setup([D1, D2]);
      manager.send(resting(20));
      manager.send(WORKING);

      expect(factory.window(0).visible).toBe(false);
      expect(factory.window(1).visible).toBe(false);
    });

    it('hides when the scheduler stops', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      manager.send(IDLE);
      expect(factory.window(0).visible).toBe(false);
    });

    it('hides on a postpone (back to working) without repeated hide calls', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      manager.send(WORKING);
      manager.send(WORKING);
      manager.send(IDLE);
      expect(factory.window(0).count('hide')).toBe(1);
    });

    it('reuses windows across rests', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      manager.send(WORKING);
      manager.send(resting(20));

      expect(factory.windows).toHaveLength(1);
      expect(factory.window(0).count('showInactive')).toBe(2);
      expect(factory.window(0).visible).toBe(true);
    });

    it('long rests dim as well', () => {
      const { factory, manager } = setup();
      manager.send(resting(600, 'long'));
      expect(factory.window(0).visible).toBe(true);
    });
  });

  describe('click blocking', () => {
    it('blocks clicks by default', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      expect(factory.window(0).interactive).toBe(true);
    });

    it('lets clicks through when blockClicks is false', () => {
      const { factory, manager } = setup([D1], { blockClicks: false });
      manager.send(resting(20));
      expect(factory.window(0).interactive).toBe(false);
      expect(factory.window(0).calls[0]).toBe('setInteractive(false)');
    });
  });

  describe('onShown', () => {
    it('fires once per rest start, not per countdown tick', () => {
      const onShown = vi.fn();
      const { manager } = setup([D1, D2], { onShown });
      manager.send(resting(20));
      manager.send(resting(19));
      expect(onShown).toHaveBeenCalledTimes(1);

      manager.send(WORKING);
      manager.send(resting(20));
      expect(onShown).toHaveBeenCalledTimes(2);
    });

    it('does not fire while hidden', () => {
      const onShown = vi.fn();
      const { manager } = setup([D1], { onShown });
      manager.send(WORKING);
      manager.send(warning(10));
      expect(onShown).not.toHaveBeenCalled();
    });

    it('fires after the windows are shown', () => {
      const { factory, manager } = setup([D1], {
        onShown: () => {
          calls.push(`onShown visible=${factory.window(0).visible}`);
        },
      });
      const calls: string[] = [];
      manager.send(resting(20));
      expect(calls).toEqual(['onShown visible=true']);
    });
  });

  describe('display changes', () => {
    it('creates a hidden window for a display added while hidden', () => {
      const { factory, ports, manager } = setup([D1]);
      manager.start();
      ports.change([D1, D2]);

      expect(factory.windows).toHaveLength(2);
      expect(factory.window(1).calls).toEqual([]);

      manager.send(resting(20));
      expect(factory.window(1).visible).toBe(true);
    });

    it('presents a display added during the rest, and re-raises the overlay', () => {
      const onShown = vi.fn();
      const { factory, ports, manager } = setup([D1], { onShown });
      manager.send(resting(20));
      onShown.mockClear();

      ports.change([D1, D2]);

      expect(factory.window(1).visible).toBe(true);
      expect(factory.window(1).interactive).toBe(true);
      expect(factory.window(1).boundsHistory).toEqual([D2.bounds]);
      expect(onShown).toHaveBeenCalledTimes(1);
    });

    it('destroys the window of a removed display', () => {
      const { factory, ports, manager } = setup([D1, D2]);
      manager.send(resting(20));
      ports.change([D1]);

      expect(factory.window(1).destroyed).toBe(true);
      expect(factory.window(0).destroyed).toBe(false);
      expect(factory.live).toHaveLength(1);
    });

    it('moves a visible window when the display is resized', () => {
      const { factory, ports, manager } = setup();
      manager.send(resting(20));
      const resized = { id: 1, bounds: { x: 0, y: 0, width: 2560, height: 1440 } };
      ports.change([resized]);

      expect(factory.window(0).boundsHistory.at(-1)).toEqual(resized.bounds);
      expect(factory.windows).toHaveLength(1);
    });

    it('does not touch a hidden window when the display is resized', () => {
      const { factory, ports, manager } = setup();
      manager.start();
      ports.change([{ id: 1, bounds: { x: 0, y: 0, width: 2560, height: 1440 } }]);
      expect(factory.window(0).calls).toEqual([]);

      // It gets the new bounds when the rest starts.
      manager.send(resting(20));
      expect(factory.window(0).boundsHistory).toEqual([
        { x: 0, y: 0, width: 2560, height: 1440 },
      ]);
    });

    it('rounds fractional display bounds', () => {
      const { factory, manager } = setup([
        { id: 1, bounds: { x: 0.4, y: 0, width: 1919.7, height: 1080.2 } },
      ]);
      manager.send(resting(20));
      expect(factory.window(0).boundsHistory).toEqual([
        { x: 0, y: 0, width: 1919, height: 1080 },
      ]);
    });
  });

  describe('window recovery', () => {
    it('recreates a destroyed window on the next snapshot and shows it', () => {
      const { factory, manager } = setup();
      manager.send(WORKING);
      factory.window(0).destroyed = true;

      manager.send(resting(20));

      expect(factory.windows).toHaveLength(2);
      expect(factory.window(1).visible).toBe(true);
    });

    it('recreates a window destroyed mid-rest', () => {
      const onShown = vi.fn();
      const { factory, manager } = setup([D1], { onShown });
      manager.send(resting(20));
      onShown.mockClear();
      factory.window(0).destroyed = true;

      manager.send(resting(19));

      expect(factory.windows).toHaveLength(2);
      expect(factory.window(1).visible).toBe(true);
      expect(onShown).toHaveBeenCalledTimes(1);
    });

    it('does not call hide on a destroyed window', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      factory.window(0).destroyed = true;
      manager.send(WORKING);
      expect(factory.window(0).count('hide')).toBe(0);
    });
  });

  describe('dispose', () => {
    it('destroys every window and stops watching displays', () => {
      const { factory, ports, manager } = setup([D1, D2]);
      manager.send(resting(20));
      manager.dispose();

      expect(factory.window(0).destroyed).toBe(true);
      expect(factory.window(1).destroyed).toBe(true);
      expect(ports.listenerCount).toBe(0);
    });

    it('ignores snapshots and display changes afterwards', () => {
      const { factory, ports, manager } = setup();
      manager.start();
      manager.dispose();

      manager.send(resting(20));
      ports.change([D1, D2]);

      expect(factory.windows).toHaveLength(1);
      expect(factory.window(0).visible).toBe(false);
    });

    it('does not restart after dispose', () => {
      const { factory, manager } = setup();
      manager.dispose();
      manager.start();
      expect(factory.windows).toHaveLength(0);
    });

    it('is idempotent', () => {
      const { factory, manager } = setup();
      manager.start();
      manager.dispose();
      manager.dispose();
      expect(factory.window(0).count('destroy')).toBe(1);
    });
  });
});
