import { describe, expect, it } from 'vitest';
import { OverlayWindowManager, isOverlayPhase } from '../../src/main/overlay/overlay-window-manager';
import { IDLE, WORKING, resting, warning } from '../helpers/fake-api';
import { FakeDisplays, FakeWindowFactory } from '../helpers/fake-overlay';

const HD = { x: 0, y: 0, width: 1920, height: 1080 };
const HD_BOUNDS = { x: 1920 - 16 - 360, y: 16, width: 360, height: 220 };

function setup(workArea = HD) {
  const factory = new FakeWindowFactory();
  const displays = new FakeDisplays(workArea);
  const manager = new OverlayWindowManager(factory, displays);
  return { factory, displays, manager };
}

describe('isOverlayPhase', () => {
  it.each([
    ['idle', false],
    ['working', false],
    ['warning', true],
    ['resting', true],
  ] as const)('%s -> %s', (phase, expected) => {
    expect(isOverlayPhase(phase)).toBe(expected);
  });
});

describe('OverlayWindowManager', () => {
  describe('start', () => {
    it('creates one hidden window at the top-right bounds', () => {
      const { factory, manager } = setup();
      manager.start();

      expect(factory.windows).toHaveLength(1);
      expect(factory.last.createdWith).toEqual(HD_BOUNDS);
      expect(factory.last.calls).toEqual([]);
    });

    it('is idempotent', () => {
      const { factory, displays, manager } = setup();
      manager.start();
      manager.start();

      expect(factory.windows).toHaveLength(1);
      expect(displays.listenerCount).toBe(1);
    });

    it('is started implicitly by the first snapshot', () => {
      const { factory, manager } = setup();
      manager.send(WORKING);
      expect(factory.windows).toHaveLength(1);
    });
  });

  describe('visibility per phase', () => {
    it('stays hidden while idle and working', () => {
      const { factory, manager } = setup();
      manager.send(IDLE);
      manager.send(WORKING);
      expect(factory.last.calls).toEqual([]);
    });

    it('shows without focus on warning, with bounds set first', () => {
      const { factory, manager } = setup();
      manager.send(warning(15));

      expect(factory.last.calls).toEqual(['setBounds', 'showInactive']);
      expect(factory.last.boundsHistory[0]).toEqual(HD_BOUNDS);
      expect(factory.last.visible).toBe(true);
    });

    it('shows on a rest even without a prior warning', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      expect(factory.last.visible).toBe(true);
    });

    it('shows once during a whole warning countdown, not on every tick', () => {
      const { factory, manager } = setup();
      for (let seconds = 15; seconds >= 1; seconds--) manager.send(warning(seconds));

      expect(factory.last.count('showInactive')).toBe(1);
      expect(factory.last.count('setBounds')).toBe(1);
    });

    it('stays visible from warning into rest without hiding or re-showing', () => {
      const { factory, manager } = setup();
      manager.send(warning(1));
      manager.send(resting(20));
      manager.send(resting(19));

      expect(factory.last.count('showInactive')).toBe(1);
      expect(factory.last.count('hide')).toBe(0);
      expect(factory.last.visible).toBe(true);
    });

    it('hides when the rest ends', () => {
      const { factory, manager } = setup();
      manager.send(resting(1));
      manager.send(WORKING);

      expect(factory.last.count('hide')).toBe(1);
      expect(factory.last.visible).toBe(false);
    });

    it('hides immediately on skip or postpone (both return to working)', () => {
      const { factory, manager } = setup();
      manager.send(resting(12));
      manager.send(WORKING);
      expect(factory.last.visible).toBe(false);
    });

    it('hides when the reminders are stopped (idle)', () => {
      const { factory, manager } = setup();
      manager.send(warning(10));
      manager.send(IDLE);
      expect(factory.last.visible).toBe(false);
    });

    it('does not call hide repeatedly while already hidden', () => {
      const { factory, manager } = setup();
      manager.send(resting(1));
      manager.send(WORKING);
      manager.send(WORKING);
      manager.send(IDLE);

      expect(factory.last.count('hide')).toBe(1);
    });

    it('reuses the same window for every rest in the cycle', () => {
      const { factory, manager } = setup();
      for (let cycle = 0; cycle < 3; cycle++) {
        manager.send(warning(15));
        manager.send(resting(20));
        manager.send(WORKING);
      }

      expect(factory.windows).toHaveLength(1);
      expect(factory.last.count('showInactive')).toBe(3);
      expect(factory.last.count('hide')).toBe(3);
    });
  });

  describe('display changes', () => {
    it('moves a visible overlay to the new top-right corner', () => {
      const { factory, displays, manager } = setup();
      manager.send(resting(20));

      displays.change({ x: 0, y: 0, width: 2560, height: 1440 });

      expect(factory.last.boundsHistory.at(-1)).toEqual({
        x: 2560 - 16 - 360,
        y: 16,
        width: 360,
        height: 220,
      });
    });

    it('does not touch a hidden window, but uses the new geometry on the next show', () => {
      const { factory, displays, manager } = setup();
      manager.start();

      displays.change({ x: 0, y: 40, width: 1366, height: 700 });
      expect(factory.last.calls).toEqual([]);

      manager.send(warning(15));
      expect(factory.last.boundsHistory.at(-1)).toEqual({
        x: 1366 - 16 - 360,
        y: 40 + 16,
        width: 360,
        height: 220,
      });
    });

    it('respects a taskbar change reported through the work area', () => {
      const { factory, displays, manager } = setup();
      manager.send(resting(20));

      displays.change({ x: 0, y: 48, width: 1920, height: 1032 });

      expect(factory.last.boundsHistory.at(-1)?.y).toBe(48 + 16);
    });
  });

  describe('destroyed window', () => {
    it('creates a new window on the next show', () => {
      const { factory, manager } = setup();
      manager.start();
      factory.last.destroyed = true;

      manager.send(warning(15));

      expect(factory.windows).toHaveLength(2);
      expect(factory.last.visible).toBe(true);
    });

    it('recovers when destroyed while visible, on the very next snapshot', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      factory.windows[0]!.destroyed = true;

      manager.send(resting(19));

      expect(factory.windows).toHaveLength(2);
      expect(factory.last.visible).toBe(true);
      expect(factory.last.count('showInactive')).toBe(1);
    });

    it('does not call hide on a destroyed window', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      const first = factory.windows[0]!;
      first.destroyed = true;

      expect(() => manager.send(WORKING)).not.toThrow();
      expect(first.count('hide')).toBe(0);
    });

    it('ignores display changes after the window was destroyed', () => {
      const { factory, displays, manager } = setup();
      manager.send(resting(20));
      factory.windows[0]!.destroyed = true;

      expect(() => displays.change({ x: 0, y: 0, width: 800, height: 600 })).not.toThrow();
    });
  });

  describe('options', () => {
    it('uses a custom size and margin', () => {
      const factory = new FakeWindowFactory();
      const manager = new OverlayWindowManager(factory, new FakeDisplays(HD), {
        size: { width: 300, height: 100 },
        margin: 40,
      });
      manager.send(warning(15));

      expect(factory.last.boundsHistory[0]).toEqual({
        x: 1920 - 40 - 300,
        y: 40,
        width: 300,
        height: 100,
      });
    });
  });

  describe('diagnostics', () => {
    it('logs window creation, show and hide with the bounds used', () => {
      const messages: string[] = [];
      const manager = new OverlayWindowManager(new FakeWindowFactory(), new FakeDisplays(HD), {
        log: (message) => messages.push(message),
      });

      manager.send(warning(15));
      manager.send(WORKING);

      expect(messages).toEqual([
        `window created ${JSON.stringify(HD_BOUNDS)}`,
        `show ${JSON.stringify(HD_BOUNDS)}`,
        'hide',
      ]);
    });

    it('logs a display change only while the overlay is visible', () => {
      const messages: string[] = [];
      const displays = new FakeDisplays(HD);
      const manager = new OverlayWindowManager(new FakeWindowFactory(), displays, {
        log: (message) => messages.push(message),
      });
      manager.start();
      displays.change({ x: 0, y: 0, width: 1366, height: 768 });
      expect(messages.some((m) => m.startsWith('display changed'))).toBe(false);

      manager.send(resting(20));
      displays.change(HD);
      expect(messages.some((m) => m.startsWith('display changed'))).toBe(true);
    });

    it('works without a logger', () => {
      const { manager } = setup();
      expect(() => manager.send(warning(15))).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('destroys the window and stops watching displays', () => {
      const { factory, displays, manager } = setup();
      manager.send(resting(20));

      manager.dispose();

      expect(factory.last.destroyed).toBe(true);
      expect(displays.listenerCount).toBe(0);
    });

    it('ignores snapshots afterwards and creates no new window', () => {
      const { factory, manager } = setup();
      manager.send(resting(20));
      manager.dispose();

      manager.send(resting(19));
      manager.start();

      expect(factory.windows).toHaveLength(1);
    });

    it('is idempotent and safe before start', () => {
      const { manager } = setup();
      expect(() => {
        manager.dispose();
        manager.dispose();
      }).not.toThrow();
    });
  });
});
