import { describe, expect, it } from 'vitest';
import { OverlayWindowManager } from '../../src/main/overlay/overlay-window-manager';
import { IDLE, resting, warning } from '../helpers/fake-api';
import { FakeDisplays, FakeWindowFactory } from '../helpers/fake-overlay';

function setup() {
  const factory = new FakeWindowFactory();
  const manager = new OverlayWindowManager(factory, new FakeDisplays());
  return { factory, manager };
}

describe('OverlayWindowManager.raise', () => {
  it('does nothing before the window is shown', () => {
    const { factory, manager } = setup();
    manager.start();
    manager.raise();
    expect(factory.last.count('moveTop')).toBe(0);
  });

  it('raises the visible overlay', () => {
    const { factory, manager } = setup();
    manager.send(warning(10));
    manager.raise();
    expect(factory.last.count('moveTop')).toBe(1);
  });

  it('raises the overlay during the rest', () => {
    const { factory, manager } = setup();
    manager.send(resting(20));
    manager.raise();
    expect(factory.last.count('moveTop')).toBe(1);
  });

  it('does nothing once the overlay is hidden again', () => {
    const { factory, manager } = setup();
    manager.send(resting(20));
    manager.send(IDLE);
    manager.raise();
    expect(factory.last.count('moveTop')).toBe(0);
  });

  it('does nothing for a destroyed window', () => {
    const { factory, manager } = setup();
    manager.send(resting(20));
    factory.last.destroyed = true;
    manager.raise();
    expect(factory.last.count('moveTop')).toBe(0);
  });

  it('does nothing after dispose', () => {
    const { factory, manager } = setup();
    manager.send(resting(20));
    manager.dispose();
    manager.raise();
    expect(factory.last.count('moveTop')).toBe(0);
  });
});
