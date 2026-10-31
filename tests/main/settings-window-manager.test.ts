import { describe, expect, it } from 'vitest';
import { SettingsWindowManager } from '../../src/main/settings/settings-window-manager';
import { FakeSettingsWindowFactory } from '../helpers/fake-settings-window';

function setup() {
  const factory = new FakeSettingsWindowFactory();
  return { factory, manager: new SettingsWindowManager(factory) };
}

describe('SettingsWindowManager', () => {
  it('creates nothing until opened', () => {
    const { factory } = setup();
    expect(factory.windows).toHaveLength(0);
  });

  it('open() creates one window and does not focus it (it shows itself when ready)', () => {
    const { factory, manager } = setup();
    manager.open();
    expect(factory.windows).toHaveLength(1);
    expect(factory.last.focused).toBe(0);
  });

  it('open() while open focuses the same window instead of creating another', () => {
    const { factory, manager } = setup();
    manager.open();
    manager.open();
    manager.open();
    expect(factory.windows).toHaveLength(1);
    expect(factory.last.focused).toBe(2);
  });

  it('open() after the user closed the window builds a fresh one', () => {
    const { factory, manager } = setup();
    manager.open();
    factory.last.userCloses();

    manager.open();

    expect(factory.windows).toHaveLength(2);
    expect(factory.windows[0]?.focused).toBe(0);
  });

  it('open() replaces a window that vanished without a closed event', () => {
    const { factory, manager } = setup();
    manager.open();
    factory.last.vanish();

    manager.open();

    expect(factory.windows).toHaveLength(2);
  });

  it('a late closed event of an old window does not forget the new one', () => {
    const { factory, manager } = setup();
    manager.open();
    const first = factory.last;
    first.vanish();
    manager.open();

    first.userCloses();
    manager.open();

    expect(factory.windows).toHaveLength(2);
    expect(factory.last.focused).toBe(1);
  });

  it('close() closes the open window and lets open() build a fresh one', () => {
    const { factory, manager } = setup();
    manager.open();
    manager.close();
    expect(factory.windows[0]?.closeCalls).toBe(1);

    manager.open();
    expect(factory.windows).toHaveLength(2);
  });

  it('close() without a window does nothing', () => {
    const { factory, manager } = setup();
    expect(() => manager.close()).not.toThrow();
    expect(factory.windows).toHaveLength(0);
  });

  it('dispose() closes the open window once', () => {
    const { factory, manager } = setup();
    manager.open();
    manager.dispose();
    manager.dispose();
    expect(factory.last.closeCalls).toBe(1);
  });

  it('dispose() without a window is safe, and open() after it works', () => {
    const { factory, manager } = setup();
    expect(() => manager.dispose()).not.toThrow();
    manager.open();
    expect(factory.windows).toHaveLength(1);
  });

  it('dispose() does not close a window that is already gone', () => {
    const { factory, manager } = setup();
    manager.open();
    factory.last.vanish();
    manager.dispose();
    expect(factory.last.closeCalls).toBe(0);
  });
});
