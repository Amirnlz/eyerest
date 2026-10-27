import { describe, expect, it } from 'vitest';
import { resolvePlacement } from '../../src/main/overlay/placement';

describe('resolvePlacement', () => {
  describe('non-Linux platforms', () => {
    it.each(['win32', 'darwin'] as const)('uses positioned on %s', (platform) => {
      expect(resolvePlacement(platform, {}, '')).toBe('positioned');
    });

    it('ignores Wayland variables outside Linux', () => {
      expect(resolvePlacement('darwin', { XDG_SESSION_TYPE: 'wayland' }, 'wayland')).toBe(
        'positioned',
      );
    });
  });

  describe('Linux', () => {
    it('uses surface when Chromium runs on native Wayland', () => {
      expect(resolvePlacement('linux', {}, 'wayland')).toBe('surface');
    });

    it('uses positioned when Chromium runs on X11, even in a Wayland session', () => {
      expect(resolvePlacement('linux', { XDG_SESSION_TYPE: 'wayland' }, 'x11')).toBe('positioned');
    });

    it('falls back to the session type when no ozone switch is set', () => {
      expect(resolvePlacement('linux', { XDG_SESSION_TYPE: 'wayland' }, '')).toBe('surface');
      expect(resolvePlacement('linux', { XDG_SESSION_TYPE: 'x11' }, '')).toBe('positioned');
    });

    it('treats WAYLAND_DISPLAY as a Wayland session', () => {
      expect(resolvePlacement('linux', { WAYLAND_DISPLAY: 'wayland-0' }, '')).toBe('surface');
    });

    it('uses positioned when nothing is known', () => {
      expect(resolvePlacement('linux', {}, '')).toBe('positioned');
    });

    it('is case and whitespace tolerant', () => {
      expect(resolvePlacement('linux', { XDG_SESSION_TYPE: ' Wayland ' }, '')).toBe('surface');
      expect(resolvePlacement('linux', {}, ' WAYLAND ')).toBe('surface');
    });
  });

  describe('EYEREST_PLACEMENT override', () => {
    it.each(['win32', 'darwin', 'linux'] as const)('forces surface on %s', (platform) => {
      expect(resolvePlacement(platform, { EYEREST_PLACEMENT: 'surface' }, 'x11')).toBe('surface');
    });

    it('forces positioned on native Wayland', () => {
      expect(resolvePlacement('linux', { EYEREST_PLACEMENT: 'positioned' }, 'wayland')).toBe(
        'positioned',
      );
    });

    it('is case and whitespace tolerant', () => {
      expect(resolvePlacement('linux', { EYEREST_PLACEMENT: ' Surface ' }, 'x11')).toBe('surface');
    });

    it.each(['', 'popup', 'true'])('ignores the invalid value "%s"', (value) => {
      expect(resolvePlacement('linux', { EYEREST_PLACEMENT: value }, 'wayland')).toBe('surface');
      expect(resolvePlacement('darwin', { EYEREST_PLACEMENT: value }, '')).toBe('positioned');
    });
  });
});
