import { describe, expect, it, vi } from 'vitest';
import { createFakeApi } from '../../helpers/fake-api';
import { followThemeFromMain, themeFromSearch } from '../../../src/renderer/theme/boot';

describe('themeFromSearch', () => {
  it.each(['system', 'light', 'dark'])('reads ?theme=%s', (theme) => {
    expect(themeFromSearch(`?theme=${theme}`)).toBe(theme);
  });

  it('works next to the other parameters main sets', () => {
    expect(themeFromSearch('?layout=surface&theme=dark&integratedDim=1')).toBe('dark');
    expect(themeFromSearch('?view=settings&theme=light')).toBe('light');
  });

  it.each(['', '?', '?layout=positioned', '?theme=', '?theme=blue', '?theme=DARK', '?theme=dark%20'])(
    'falls back to System for %j',
    (search) => {
      expect(themeFromSearch(search)).toBe('system');
    },
  );
});

describe('followThemeFromMain', () => {
  it('applies each pushed choice to the controller', () => {
    const api = createFakeApi();
    const controller = { setPreference: vi.fn() };
    followThemeFromMain(controller, api);

    api.pushTheme('dark');
    api.pushTheme('system');

    expect(controller.setPreference).toHaveBeenNthCalledWith(1, 'dark');
    expect(controller.setPreference).toHaveBeenNthCalledWith(2, 'system');
  });

  it('stops after unsubscribe', () => {
    const api = createFakeApi();
    const controller = { setPreference: vi.fn() };
    const off = followThemeFromMain(controller, api);
    expect(api.themeListenerCount()).toBe(1);
    off();
    api.pushTheme('light');
    expect(api.themeListenerCount()).toBe(0);
    expect(controller.setPreference).not.toHaveBeenCalled();
  });
});
