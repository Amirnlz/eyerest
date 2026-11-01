import { describe, expect, it } from 'vitest';
import { createLoginItemAutostart } from '../../src/main/autostart/login-item-autostart';

function fakeApp(openAtLogin = false) {
  const calls: { openAtLogin: boolean }[] = [];
  let current = openAtLogin;
  return {
    calls,
    app: {
      getLoginItemSettings: () => ({ openAtLogin: current }),
      setLoginItemSettings: (settings: { openAtLogin: boolean }) => {
        calls.push(settings);
        current = settings.openAtLogin;
      },
    },
  };
}

describe('createLoginItemAutostart', () => {
  it('reads the OS login item', () => {
    expect(createLoginItemAutostart(fakeApp(true).app).getState()).toEqual({
      supported: true,
      enabled: true,
    });
    expect(createLoginItemAutostart(fakeApp(false).app).getState()).toEqual({
      supported: true,
      enabled: false,
    });
  });

  it('registers and removes the login item, and the state follows', () => {
    const { app, calls } = fakeApp();
    const port = createLoginItemAutostart(app);
    port.setEnabled(true);
    expect(port.getState()).toEqual({ supported: true, enabled: true });
    port.setEnabled(false);
    expect(port.getState()).toEqual({ supported: true, enabled: false });
    expect(calls).toEqual([{ openAtLogin: true }, { openAtLogin: false }]);
  });
});
