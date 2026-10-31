import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_ARTWORK, BRAND_ICONS, DMG_LAYOUT } from '../../src/design/brand-icons';
import { TRAY_ICON_DIR_NAME, TRAY_ICON_FILES } from '../../src/main/tray/tray-icon';

const root = join(__dirname, '../..');

interface BuilderConfig {
  directories?: { buildResources?: string };
  extraResources?: { from?: string; to?: string; filter?: string[] }[];
  linux?: { icon?: string };
  win?: { icon?: string };
  mac?: { icon?: string };
  dmg?: {
    background?: string;
    iconSize?: number;
    window?: { width?: number; height?: number };
    contents?: { x?: number; y?: number; type?: string; path?: string }[];
  };
  nsis?: { oneClick?: boolean; installerSidebar?: string; installerHeader?: string };
}

const builder = JSON.parse(readFileSync(join(root, 'electron-builder.json'), 'utf8')) as BuilderConfig;

describe('app icon in the builder config', () => {
  it.each(['linux', 'win', 'mac'] as const)('%s references an icon file that exists', (platform) => {
    const icon = builder[platform]?.icon;
    expect(icon, platform).toBeDefined();
    expect(existsSync(join(root, icon ?? '')), `${platform}: ${icon}`).toBe(true);
  });

  it('every platform uses the icon the generator makes', () => {
    const app = BRAND_ICONS.find((icon) => icon.role === 'app');
    expect(app).toBeDefined();
    for (const platform of ['linux', 'win', 'mac'] as const) {
      expect(builder[platform]?.icon).toBe(app?.file);
    }
  });

  it('keeps build resources in the default folder the icon lives in', () => {
    expect(builder.directories?.buildResources ?? 'build').toBe('build');
  });
});

describe('tray icons in the builder config', () => {
  const entry = builder.extraResources?.find((resource) => resource.from === 'resources/tray');

  it('copies resources/tray to the folder the app reads at run time', () => {
    expect(entry).toBeDefined();
    expect(entry?.to).toBe(TRAY_ICON_DIR_NAME);
  });

  it('copies PNG files, which covers the @2x variants', () => {
    expect(entry?.filter).toContain('*.png');
  });

  it('the folder holds exactly the generated tray files, no strays', () => {
    const expected = BRAND_ICONS.filter((icon) => icon.file.startsWith('resources/tray/'))
      .map((icon) => icon.file.replace('resources/tray/', ''))
      .sort();
    expect(readdirSync(join(root, 'resources/tray')).sort()).toEqual(expected);
  });

  it('every file the app can select is generated, with its @2x variant', () => {
    const generated = new Set(BRAND_ICONS.map((icon) => icon.file.replace('resources/tray/', '')));
    for (const file of TRAY_ICON_FILES) {
      expect(generated.has(file), file).toBe(true);
      expect(generated.has(file.replace('.png', '@2x.png')), file).toBe(true);
    }
  });
});

describe('DMG artwork in the builder config', () => {
  it('references the base background, and the @2x file sits next to it', () => {
    expect(builder.dmg?.background).toBe(BRAND_ARTWORK[0]?.file);
    for (const art of BRAND_ARTWORK) expect(existsSync(join(root, art.file)), art.file).toBe(true);
  });

  it('the window is the size of the image', () => {
    expect(builder.dmg?.window).toEqual({ width: DMG_LAYOUT.width, height: DMG_LAYOUT.height });
  });

  it('places the app and the Applications link where the arrow expects them', () => {
    expect(builder.dmg?.iconSize).toBe(DMG_LAYOUT.iconSize);
    expect(builder.dmg?.contents).toEqual([
      { x: DMG_LAYOUT.app.x, y: DMG_LAYOUT.app.y },
      { x: DMG_LAYOUT.applications.x, y: DMG_LAYOUT.applications.y, type: 'link', path: '/Applications' },
    ]);
  });
});

describe('NSIS artwork', () => {
  // electron-builder shows the sidebar and header images only in the assisted (wizard) installer.
  // The installer is one-click, so those files would never appear. Switching to the wizard is a
  // change of installer behavior and a roadmap candidate, not part of the design pass.
  it('is not configured while the installer is one-click', () => {
    expect(builder.nsis?.oneClick ?? true).toBe(true);
    expect(builder.nsis?.installerSidebar).toBeUndefined();
    expect(builder.nsis?.installerHeader).toBeUndefined();
  });
});
