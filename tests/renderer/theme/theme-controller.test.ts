import { describe, expect, it, vi } from 'vitest';
import {
  createThemeController,
  type ColorSchemeSource,
  type ThemeTarget,
} from '../../../src/renderer/theme';
import type { ThemeName } from '../../../src/design/tokens';

/** Fakes for every port: no DOM, no matchMedia, no frames. */
function setup(osDark = false) {
  const applied: (ThemeName | null)[] = [];
  const events: string[] = [];
  const target: ThemeTarget = {
    apply(theme) {
      applied.push(theme);
      events.push('apply');
    },
  };

  let dark = osDark;
  const listeners = new Set<() => void>();
  const colorScheme: ColorSchemeSource = {
    prefersDark: () => dark,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  const suppressTransitions = vi.fn((apply: () => void) => {
    events.push('suppress:begin');
    apply();
    events.push('suppress:end');
  });

  return {
    applied,
    events,
    listeners,
    suppressTransitions,
    setOsDark(value: boolean) {
      dark = value;
      for (const listener of [...listeners]) listener();
    },
    make: (initial?: Parameters<typeof createThemeController>[1]) =>
      createThemeController({ target, colorScheme, suppressTransitions }, initial),
  };
}

describe('ThemeController', () => {
  it('defaults to system and resolves it from the OS', () => {
    const env = setup(true);
    const controller = env.make();
    expect(controller.preference()).toBe('system');
    expect(controller.resolved()).toBe('dark');
  });

  it('start applies the preference once, without suppression', () => {
    const env = setup();
    env.make('dark').start();
    expect(env.applied).toEqual(['dark']);
    expect(env.suppressTransitions).not.toHaveBeenCalled();
  });

  it('start with system removes the override', () => {
    const env = setup();
    env.make().start();
    expect(env.applied).toEqual([null]);
  });

  it('changing the preference applies it inside the suppressor', () => {
    const env = setup();
    const controller = env.make();
    controller.start();
    env.applied.length = 0;

    controller.setPreference('dark');

    expect(env.suppressTransitions).toHaveBeenCalledTimes(1);
    expect(env.applied).toEqual(['dark']);
    expect(controller.preference()).toBe('dark');
    expect(controller.resolved()).toBe('dark');
  });

  it('applies the change between suppression begin and end', () => {
    const env = setup();
    const controller = env.make();
    controller.start();
    env.events.length = 0;

    controller.setPreference('light');

    expect(env.events).toEqual(['suppress:begin', 'apply', 'suppress:end']);
  });

  it('setting the same preference does nothing', () => {
    const env = setup();
    const controller = env.make('light');
    controller.start();
    env.applied.length = 0;

    controller.setPreference('light');

    expect(env.applied).toEqual([]);
    expect(env.suppressTransitions).not.toHaveBeenCalled();
  });

  it.each([
    ['light', 'system', null],
    ['system', 'light', 'light'],
    ['dark', 'light', 'light'],
  ] as const)('%s to %s applies %s', (from, to, expected) => {
    const env = setup();
    const controller = env.make(from);
    controller.start();
    env.applied.length = 0;
    controller.setPreference(to);
    expect(env.applied).toEqual([expected]);
  });

  describe('OS changes', () => {
    it('suppresses transitions when the OS flips and the preference is system', () => {
      const env = setup(false);
      const controller = env.make();
      controller.start();

      env.setOsDark(true);

      expect(env.suppressTransitions).toHaveBeenCalledTimes(1);
      expect(controller.resolved()).toBe('dark');
      // Nothing to write: the media query in the stylesheet does the work.
      expect(env.applied).toEqual([null]);
    });

    it('follows every flip', () => {
      const env = setup(false);
      const controller = env.make();
      controller.start();
      env.setOsDark(true);
      env.setOsDark(false);
      expect(env.suppressTransitions).toHaveBeenCalledTimes(2);
      expect(controller.resolved()).toBe('light');
    });

    it.each(['light', 'dark'] as const)('ignores the OS while %s is forced', (forced) => {
      const env = setup(false);
      const controller = env.make(forced);
      controller.start();

      env.setOsDark(true);

      expect(env.suppressTransitions).not.toHaveBeenCalled();
      expect(controller.resolved()).toBe(forced);
    });

    it('starts following again after switching back to system', () => {
      const env = setup(false);
      const controller = env.make('dark');
      controller.start();
      controller.setPreference('system');
      env.suppressTransitions.mockClear();

      env.setOsDark(true);

      expect(env.suppressTransitions).toHaveBeenCalledTimes(1);
    });
  });

  describe('lifecycle', () => {
    it('start twice subscribes once', () => {
      const env = setup();
      const controller = env.make();
      controller.start();
      controller.start();
      expect(env.listeners.size).toBe(1);
      expect(env.applied).toEqual([null]);
    });

    it('stop removes the OS listener, and a flip afterwards does nothing', () => {
      const env = setup();
      const controller = env.make();
      controller.start();
      controller.stop();
      expect(env.listeners.size).toBe(0);
      env.setOsDark(true);
      expect(env.suppressTransitions).not.toHaveBeenCalled();
    });

    it('can start again after stop', () => {
      const env = setup();
      const controller = env.make();
      controller.start();
      controller.stop();
      controller.start();
      expect(env.listeners.size).toBe(1);
    });

    it('stop before start is harmless', () => {
      const env = setup();
      expect(() => env.make().stop()).not.toThrow();
    });
  });
});
