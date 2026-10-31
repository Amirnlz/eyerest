import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TRAY_ICON_DIR_NAME,
  TRAY_ICON_FILES,
  selectTrayIconFile,
  trayIconDir,
} from '../../src/main/tray/tray-icon';

describe('selectTrayIconFile', () => {
  it('macOS always uses the template image, in either theme', () => {
    expect(selectTrayIconFile('darwin', false)).toBe('trayTemplate.png');
    expect(selectTrayIconFile('darwin', true)).toBe('trayTemplate.png');
  });

  it.each(['win32', 'linux'] as const)('%s uses the light glyph on dark colors', (platform) => {
    expect(selectTrayIconFile(platform, true)).toBe('tray-on-dark.png');
  });

  it.each(['win32', 'linux'] as const)('%s uses the dark glyph on light colors', (platform) => {
    expect(selectTrayIconFile(platform, false)).toBe('tray-on-light.png');
  });

  it('every file it can return is listed in TRAY_ICON_FILES', () => {
    const platforms = ['darwin', 'win32', 'linux'] as const;
    for (const platform of platforms) {
      for (const dark of [false, true]) {
        expect(TRAY_ICON_FILES).toContain(selectTrayIconFile(platform, dark));
      }
    }
  });
});

describe('trayIconDir', () => {
  const location = { resourcesPath: join('opt', 'eyerest', 'resources'), appPath: join('home', 'dev', 'eyerest') };

  it('is next to app.asar in a packaged app', () => {
    expect(trayIconDir({ ...location, isPackaged: true })).toBe(join(location.resourcesPath, 'tray'));
  });

  it('is the repository resources folder in development', () => {
    expect(trayIconDir({ ...location, isPackaged: false })).toBe(join(location.appPath, 'resources', 'tray'));
  });

  it('uses the folder name electron-builder copies the files to', () => {
    expect(TRAY_ICON_DIR_NAME).toBe('tray');
  });
});

describe('tray icon files on disk', () => {
  const dir = trayIconDir({ isPackaged: false, resourcesPath: '', appPath: join(__dirname, '../..') });

  it.each(TRAY_ICON_FILES)('%s and its @2x file exist', (file) => {
    expect(existsSync(join(dir, file)), file).toBe(true);
    expect(existsSync(join(dir, file.replace('.png', '@2x.png'))), file).toBe(true);
  });
});
