import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  themePreferences,
} from '../../src/shared/theme';

describe('theme preference contract', () => {
  it('offers System, Light and Dark, and defaults to System', () => {
    expect([...themePreferences]).toEqual(['system', 'light', 'dark']);
    expect(DEFAULT_THEME_PREFERENCE).toBe('system');
  });

  it.each(['system', 'light', 'dark'])('accepts %s', (value) => {
    expect(isThemePreference(value)).toBe(true);
  });

  it.each([undefined, null, '', 'Dark', 'auto', 'blue', 1, {}, ['dark']])('rejects %j', (value) => {
    expect(isThemePreference(value)).toBe(false);
  });
});
