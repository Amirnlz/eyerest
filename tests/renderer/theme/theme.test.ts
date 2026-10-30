import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  resolveTheme,
  themeAttribute,
  themePreferences,
} from '../../../src/renderer/theme';

describe('theme preference', () => {
  it('defaults to following the OS', () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('system');
  });

  it.each(themePreferences)('accepts %s', (value) => {
    expect(isThemePreference(value)).toBe(true);
  });

  it.each(['', 'auto', 'Dark', 'LIGHT', null, undefined, 1, {}])(
    'rejects %j',
    (value) => {
      expect(isThemePreference(value)).toBe(false);
    },
  );
});

describe('themeAttribute', () => {
  it('removes the attribute for system, so the media query decides', () => {
    expect(themeAttribute('system')).toBeNull();
  });

  it('forces light and dark by name', () => {
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('dark')).toBe('dark');
  });
});

describe('resolveTheme', () => {
  it.each([
    ['system', false, 'light'],
    ['system', true, 'dark'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
  ] as const)('%s with OS dark=%s resolves to %s', (preference, osDark, expected) => {
    expect(resolveTheme(preference, osDark)).toBe(expected);
  });
});
