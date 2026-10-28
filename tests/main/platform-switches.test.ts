import { describe, expect, it } from 'vitest';
import { isNativeWayland } from '../../src/main/overlay/placement';
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
    it('leaves the choice to Electron by default', () => {
      expect(resolveStartupConfig('linux', {}).switches).toEqual([]);
    });

    it('does not force a backend in a Wayland session', () => {
      expect(resolveStartupConfig('linux', { XDG_SESSION_TYPE: 'wayland' }).switches).toEqual([]);
    });

    it('forces X11 with EYEREST_OZONE=x11', () => {
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: 'x11' }).switches).toEqual(X11);
    });

    it('forces native Wayland with EYEREST_OZONE=wayland', () => {
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: 'wayland' }).switches).toEqual(WAYLAND);
    });

    it('treats EYEREST_OZONE=auto as no override', () => {
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: 'auto' }).switches).toEqual([]);
    });

    it('is case and whitespace tolerant', () => {
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: ' Wayland ' }).switches).toEqual(
        WAYLAND,
      );
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: 'X11' }).switches).toEqual(X11);
    });

    it.each(['', 'x12', 'true', undefined])('ignores the value %s', (value) => {
      expect(resolveStartupConfig('linux', { EYEREST_OZONE: value }).switches).toEqual([]);
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

describe('isNativeWayland', () => {
  it('detects Wayland from the selected backend or session environment', () => {
    expect(isNativeWayland('linux', {}, 'wayland')).toBe(true);
    expect(isNativeWayland('linux', { XDG_SESSION_TYPE: 'wayland' }, '')).toBe(true);
    expect(isNativeWayland('linux', { WAYLAND_DISPLAY: 'wayland-0' }, '')).toBe(true);
  });

  it('honors an X11 override and returns false on other platforms', () => {
    expect(
      isNativeWayland(
        'linux',
        { XDG_SESSION_TYPE: 'wayland', EYEREST_OZONE: 'x11' },
        'x11',
      ),
    ).toBe(false);
    expect(isNativeWayland('darwin', { WAYLAND_DISPLAY: 'wayland-0' }, '')).toBe(false);
  });
});
