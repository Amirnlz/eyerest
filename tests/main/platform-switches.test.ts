import { describe, expect, it } from 'vitest';
import { resolveStartupConfig } from '../../src/main/platform-switches';

const X11 = [{ name: 'ozone-platform', value: 'x11' }];
const WAYLAND = [{ name: 'ozone-platform', value: 'wayland' }];

describe('resolveStartupConfig', () => {
  describe('other platforms', () => {
    it.each(['win32', 'darwin', 'freebsd'] as const)('changes nothing on %s', (platform) => {
      const expected = { switches: [], disableHardwareAcceleration: false };
      expect(resolveStartupConfig(platform, {})).toEqual(expected);
      expect(
        resolveStartupConfig(platform, { EYEREST_OZONE: 'wayland', EYEREST_GPU: '0' }),
      ).toEqual(expected);
    });
  });

  describe('Linux display backend', () => {
    it('forces X11 by default, so the overlay can be positioned', () => {
      expect(resolveStartupConfig('linux', {}).switches).toEqual(X11);
    });

    it('forces X11 even when the session is Wayland', () => {
      expect(resolveStartupConfig('linux', { XDG_SESSION_TYPE: 'wayland' }).switches).toEqual(X11);
    });

    it('allows native Wayland through EYEREST_OZONE=wayland', () => {
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: 'wayland' }).switches).toEqual(WAYLAND);
    });

    it('leaves the choice to Electron with EYEREST_OZONE=auto', () => {
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: 'auto' }).switches).toEqual([]);
    });

    it('is case and whitespace tolerant', () => {
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: ' Wayland ' }).switches).toEqual(
        WAYLAND,
      );
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: 'AUTO' }).switches).toEqual([]);
    });

    it.each(['', 'x12', 'true', undefined])('falls back to X11 for %s', (value) => {
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: value }).switches).toEqual(X11);
    });
  });

  describe('Linux GPU', () => {
    it('disables hardware acceleration by default', () => {
      expect(resolveStartupConfig('linux', {}).disableHardwareAcceleration).toBe(true);
    });

    it('keeps it enabled with EYEREST_GPU=1', () => {
      expect(resolveStartupConfig('linux', { EYEREST_GPU: '1' }).disableHardwareAcceleration).toBe(
        false,
      );
    });

    it.each(['0', '', 'true', 'yes', undefined])('EYEREST_GPU=%s keeps it disabled', (value) => {
      expect(resolveStartupConfig('linux', { EYEREST_GPU: value }).disableHardwareAcceleration).toBe(
        true,
      );
    });

    it('is independent of the display backend setting', () => {
      const config = resolveStartupConfig('linux', { EYEREST_OZONE: 'wayland' });
      expect(config.switches).toEqual(WAYLAND);
      expect(config.disableHardwareAcceleration).toBe(true);
    });
  });
});
