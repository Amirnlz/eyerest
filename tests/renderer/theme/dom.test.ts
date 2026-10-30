// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createColorSchemeSource,
  createDocumentThemeTarget,
  createDomThemeController,
} from '../../../src/renderer/theme';

type ChangeHandler = () => void;

/** Minimal MediaQueryList: enough for the adapter, with a way to flip the OS setting. */
function fakeMatchMedia(initialDark: boolean) {
  const handlers = new Set<ChangeHandler>();
  const queries: string[] = [];
  const state = { dark: initialDark };
  const list = {
    get matches() {
      return state.dark;
    },
    addEventListener: (_type: 'change', handler: ChangeHandler) => handlers.add(handler),
    removeEventListener: (_type: 'change', handler: ChangeHandler) => handlers.delete(handler),
  };
  return {
    matchMedia: (query: string) => {
      queries.push(query);
      return list as unknown as MediaQueryList;
    },
    queries,
    handlers,
    flip(dark: boolean) {
      state.dark = dark;
      for (const handler of [...handlers]) handler();
    },
  };
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.head.replaceChildren();
  vi.restoreAllMocks();
});

describe('createDocumentThemeTarget', () => {
  it('sets and removes data-theme on the root', () => {
    const target = createDocumentThemeTarget(document.documentElement);
    target.apply('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    target.apply('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    target.apply(null);
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});

describe('createColorSchemeSource', () => {
  it('asks for the dark color scheme query and reports its value', () => {
    const media = fakeMatchMedia(true);
    const source = createColorSchemeSource(media);
    expect(media.queries).toEqual(['(prefers-color-scheme: dark)']);
    expect(source.prefersDark()).toBe(true);
    media.flip(false);
    expect(source.prefersDark()).toBe(false);
  });

  it('notifies on an OS change and stops after unsubscribe', () => {
    const media = fakeMatchMedia(false);
    const source = createColorSchemeSource(media);
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);

    media.flip(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(media.handlers.size).toBe(0);
    media.flip(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('createDomThemeController (real document, fake OS)', () => {
  function build(initialDark = false) {
    const media = fakeMatchMedia(initialDark);
    const frameQueue: (() => void)[] = [];
    const win = {
      document,
      matchMedia: media.matchMedia,
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frameQueue.push(() => callback(0));
        return frameQueue.length;
      },
    } as unknown as Window;
    const runFrame = () => {
      for (const callback of frameQueue.splice(0)) callback();
    };
    return { controller: createDomThemeController(win), media, runFrame };
  }

  const overrideCount = () =>
    [...document.head.querySelectorAll('style')].filter((s) =>
      s.textContent?.includes('transition:none'),
    ).length;

  it('starts with no data-theme, so the OS decides', () => {
    const { controller } = build();
    controller.start();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('switching to dark sets the attribute and suppresses transitions for two frames', () => {
    const { controller, runFrame } = build();
    controller.start();

    controller.setPreference('dark');

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(overrideCount()).toBe(1);
    runFrame();
    expect(overrideCount()).toBe(1);
    runFrame();
    expect(overrideCount()).toBe(0);
  });

  it('switching back to system removes the attribute', () => {
    const { controller } = build();
    controller.start();
    controller.setPreference('dark');
    controller.setPreference('system');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('an OS flip under system suppresses transitions and changes no attribute', () => {
    const { controller, media, runFrame } = build(false);
    controller.start();

    media.flip(true);

    expect(overrideCount()).toBe(1);
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(controller.resolved()).toBe('dark');
    runFrame();
    runFrame();
    expect(overrideCount()).toBe(0);
  });

  it('an OS flip under a forced theme changes nothing', () => {
    const { controller, media } = build(false);
    controller.start();
    controller.setPreference('light');
    media.flip(true);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(controller.resolved()).toBe('light');
  });
});
