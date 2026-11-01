import { describe, expect, it } from 'vitest';
import { createAutostart, type CreateAutostartDeps } from '../../src/main/autostart/create-autostart';
import { FakeSettingsFs } from '../helpers/fake-lifecycle';

function deps(overrides: Partial<CreateAutostartDeps> = {}) {
  const loginCalls: boolean[] = [];
  const fs = new FakeSettingsFs();
  const base: CreateAutostartDeps = {
    platform: 'linux',
    isPackaged: true,
    env: {},
    execPath: '/opt/eyerest/eyerest',
    loginItemApp: {
      getLoginItemSettings: () => ({ openAtLogin: false }),
      setLoginItemSettings: (settings) => loginCalls.push(settings.openAtLogin),
    },
    fs,
    configHome: '/home/u/.config',
    ...overrides,
  };
  return { base, loginCalls, fs };
}

describe('createAutostart', () => {
  it.each(['linux', 'win32', 'darwin'] as const)('a dev run on %s is unsupported and never writes', (platform) => {
    const { base, loginCalls, fs } = deps({ platform, isPackaged: false });
    const port = createAutostart(base);
    expect(port.getState()).toEqual({ supported: false });
    port.setEnabled(true);
    expect(loginCalls).toEqual([]);
    expect(fs.ops).toEqual([]);
  });

  it.each(['win32', 'darwin'] as const)('a packaged %s build uses the login item API', (platform) => {
    const { base, loginCalls } = deps({ platform });
    const port = createAutostart(base);
    expect(port.getState()).toEqual({ supported: true, enabled: false });
    port.setEnabled(true);
    expect(loginCalls).toEqual([true]);
  });

  it('a packaged linux build writes a desktop entry in the config folder', () => {
    const { base, fs } = deps();
    createAutostart(base).setEnabled(true);
    expect(fs.files.get('/home/u/.config/autostart/eyerest.desktop')).toContain(
      'Exec="/opt/eyerest/eyerest"',
    );
  });

  it('a packaged AppImage launches the AppImage file', () => {
    const { base, fs } = deps({ env: { APPIMAGE: '/home/u/eyerest.AppImage' } });
    createAutostart(base).setEnabled(true);
    expect(fs.files.get('/home/u/.config/autostart/eyerest.desktop')).toContain(
      'Exec="/home/u/eyerest.AppImage"',
    );
  });

  it('any other platform is unsupported', () => {
    const { base } = deps({ platform: 'freebsd' });
    expect(createAutostart(base).getState()).toEqual({ supported: false });
  });
});
