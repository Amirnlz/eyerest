import { describe, expect, it } from 'vitest';
import {
  buildDesktopEntry,
  createLinuxDesktopAutostart,
  isDesktopEntryEnabled,
  quoteExec,
  resolveLinuxExec,
} from '../../src/main/autostart/linux-desktop-autostart';
import { FakeSettingsFs } from '../helpers/fake-lifecycle';

const FILE = '/home/u/.config/autostart/eyerest.desktop';

function setup(execPath = '/opt/eyerest/eyerest') {
  const fs = new FakeSettingsFs();
  const port = createLinuxDesktopAutostart({ fs, configHome: '/home/u/.config', execPath });
  return { fs, port };
}

describe('resolveLinuxExec', () => {
  it('prefers the AppImage file: its mount path vanishes after the session', () => {
    expect(resolveLinuxExec({ APPIMAGE: '/home/u/eyerest.AppImage' }, '/tmp/.mount_x/eyerest')).toBe(
      '/home/u/eyerest.AppImage',
    );
  });

  it('uses execPath for a deb install', () => {
    expect(resolveLinuxExec({}, '/opt/eyerest/eyerest')).toBe('/opt/eyerest/eyerest');
  });

  it('ignores an empty APPIMAGE', () => {
    expect(resolveLinuxExec({ APPIMAGE: '' }, '/opt/eyerest/eyerest')).toBe('/opt/eyerest/eyerest');
  });
});

describe('quoteExec', () => {
  it('wraps a plain path in double quotes', () => {
    expect(quoteExec('/opt/eyerest/eyerest')).toBe('"/opt/eyerest/eyerest"');
  });

  it('keeps spaces inside the quotes', () => {
    expect(quoteExec('/home/my user/eye rest.AppImage')).toBe('"/home/my user/eye rest.AppImage"');
  });

  it('escapes the characters the Exec key treats specially', () => {
    expect(quoteExec('/a"b`c$d\\e')).toBe('"/a\\"b\\`c\\$d\\\\e"');
  });

  it('doubles a percent sign so it is not read as a field code', () => {
    expect(quoteExec('/a%u')).toBe('"/a%%u"');
  });
});

describe('buildDesktopEntry', () => {
  it('is a valid application entry that autostart hosts enable', () => {
    const text = buildDesktopEntry('/opt/eyerest/eyerest');
    expect(text.startsWith('[Desktop Entry]\n')).toBe(true);
    expect(text).toContain('Type=Application\n');
    expect(text).toContain('Name=eyerest\n');
    expect(text).toContain('Exec="/opt/eyerest/eyerest"\n');
    expect(text).toContain('Terminal=false\n');
    expect(text).toContain('X-GNOME-Autostart-enabled=true\n');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('reads back as enabled', () => {
    expect(isDesktopEntryEnabled(buildDesktopEntry('/x'))).toBe(true);
  });
});

describe('isDesktopEntryEnabled', () => {
  it.each(['Hidden=true', 'X-GNOME-Autostart-enabled=false', '  Hidden=true  '])(
    'is off when the session disabled it with %s',
    (line) => {
      expect(isDesktopEntryEnabled(`[Desktop Entry]\nType=Application\n${line}\n`)).toBe(false);
    },
  );

  it('is on for an entry with neither key', () => {
    expect(isDesktopEntryEnabled('[Desktop Entry]\nType=Application\nExec=x\n')).toBe(true);
  });
});

describe('createLinuxDesktopAutostart', () => {
  it('is supported and off when there is no file', () => {
    expect(setup().port.getState()).toEqual({ supported: true, enabled: false });
  });

  it('enabling creates the autostart folder, then writes the entry', () => {
    const { fs, port } = setup();
    port.setEnabled(true);
    expect(fs.ops).toEqual(['ensureDir /home/u/.config/autostart', `writeFile ${FILE}`]);
    expect(fs.files.get(FILE)).toBe(buildDesktopEntry('/opt/eyerest/eyerest'));
    expect(port.getState()).toEqual({ supported: true, enabled: true });
  });

  it('enabling twice rewrites the same file (idempotent)', () => {
    const { fs, port } = setup();
    port.setEnabled(true);
    port.setEnabled(true);
    expect(fs.files.size).toBe(1);
    expect(port.getState()).toEqual({ supported: true, enabled: true });
  });

  it('disabling removes the file, and removing a missing one is fine', () => {
    const { fs, port } = setup();
    port.setEnabled(true);
    port.setEnabled(false);
    expect(fs.files.has(FILE)).toBe(false);
    expect(port.getState()).toEqual({ supported: true, enabled: false });
    expect(() => port.setEnabled(false)).not.toThrow();
  });

  it('shows an entry the session disabled as off', () => {
    const { fs, port } = setup();
    fs.files.set(FILE, '[Desktop Entry]\nHidden=true\n');
    expect(port.getState()).toEqual({ supported: true, enabled: false });
  });

  it('lets a write failure propagate for the tray to log', () => {
    const { fs, port } = setup();
    fs.failOn = 'writeFile';
    expect(() => port.setEnabled(true)).toThrow('disk full');
  });

  it('uses the given path in the entry, such as an AppImage with spaces', () => {
    const { fs, port } = setup('/home/my user/eyerest.AppImage');
    port.setEnabled(true);
    expect(fs.files.get(FILE)).toContain('Exec="/home/my user/eyerest.AppImage"');
  });
});
