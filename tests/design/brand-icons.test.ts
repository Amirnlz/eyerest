import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { contrastRatio } from '../../src/design/color';
import {
  BRAND_ARTWORK,
  BRAND_ICONS,
  DMG_LAYOUT,
  EYE_IRIS,
  EYE_PATH,
  ROLE_STYLES,
  decodePng,
  encodePng,
  flattenPath,
  renderDmgBackground,
  renderIcon,
  type IconSpec,
} from '../../src/design/brand-icons';
import { palette, resolveToken, themes } from '../../src/design/tokens';
import { icons } from '../../src/renderer/ui/icons';

/**
 * The committed PNG files must equal what the generator renders. Run `npm run icons` to rewrite
 * them after changing the generator; the same test then passes. Pixels are compared, not bytes,
 * because zlib output can differ between Node versions.
 */

const root = (relative: string): string => join(__dirname, '../..', relative);

if (process.env['EYEREST_WRITE_ICONS'] === '1') {
  beforeAll(() => {
    for (const spec of BRAND_ICONS) {
      mkdirSync(dirname(root(spec.file)), { recursive: true });
      writeFileSync(root(spec.file), encodePng(spec.size, spec.size, renderIcon(spec)));
    }
    for (const art of BRAND_ARTWORK) {
      const width = DMG_LAYOUT.width * art.scale;
      const height = DMG_LAYOUT.height * art.scale;
      writeFileSync(root(art.file), encodePng(width, height, renderDmgBackground(art.scale)));
    }
  });
}

const spec = (file: string): IconSpec => {
  const found = BRAND_ICONS.find((candidate) => candidate.file === file);
  if (!found) throw new Error(`No spec for ${file}`);
  return found;
};

const pixel = (png: ReturnType<typeof decodePng>, x: number, y: number): readonly number[] => {
  const offset = (y * png.width + x) * 4;
  return [...png.rgba.subarray(offset, offset + 4)];
};

const decodeFile = (file: string) => decodePng(readFileSync(root(file)));

describe('the brand mark is the design system eye', () => {
  const eye = icons.eye.shapes;

  it('uses the same outline path as icons.eye', () => {
    expect(eye[0]).toMatchObject({ kind: 'path', d: EYE_PATH });
  });

  it('uses the same iris as icons.eye', () => {
    expect(eye[1]).toMatchObject({ kind: 'circle', ...EYE_IRIS });
  });

  it('flattens the outline to the almond extent (x 2 to 22, y 5 to 19)', () => {
    const points = flattenPath(EYE_PATH);
    expect(Math.min(...points.map((p) => p.x))).toBeCloseTo(2, 5);
    expect(Math.max(...points.map((p) => p.x))).toBeCloseTo(22, 5);
    expect(Math.min(...points.map((p) => p.y))).toBeCloseTo(5, 1);
    expect(Math.max(...points.map((p) => p.y))).toBeCloseTo(19, 1);
  });

  it('rejects path commands the parser does not know', () => {
    expect(() => flattenPath('M0 0L5 5')).toThrow(/Unsupported path command/);
  });
});

describe('PNG encoder and decoder', () => {
  it('round-trips pixels', () => {
    const rgba = Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 40]);
    const decoded = decodePng(encodePng(2, 2, rgba));
    expect([decoded.width, decoded.height]).toEqual([2, 2]);
    expect([...decoded.rgba]).toEqual([...rgba]);
  });

  it('writes the PNG signature', () => {
    const bytes = encodePng(1, 1, Uint8Array.from([0, 0, 0, 0]));
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('rejects data that is not a PNG', () => {
    expect(() => decodePng(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow(/Not a PNG/);
  });
});

describe('committed icon files', () => {
  it.each(BRAND_ICONS)('$file matches the generator', (icon) => {
    const png = decodeFile(icon.file);
    expect([png.width, png.height]).toEqual([icon.size, icon.size]);
    expect([...png.rgba]).toEqual([...renderIcon(icon)]);
  });

  it('every @2x file is the 1x icon at twice the size and the same role', () => {
    const doubles = BRAND_ICONS.filter((icon) => icon.file.includes('@2x'));
    expect(doubles).toHaveLength(3);
    for (const double of doubles) {
      const single = spec(double.file.replace('@2x', ''));
      expect(double.size).toBe(single.size * 2);
      expect(double.role).toBe(single.role);
    }
  });

  it('the app icon is large enough for macOS and Windows (at least 512 square)', () => {
    expect(spec('build/icon.png').size).toBeGreaterThanOrEqual(512);
  });
});

describe('icon appearance', () => {
  it('uses palette colors only', () => {
    const palettes = new Set(Object.values(palette).map((hex) => hex.toUpperCase()));
    for (const style of Object.values(ROLE_STYLES)) {
      expect(palettes.has(style.glyph.toUpperCase()), style.glyph).toBe(true);
      if (style.background) expect(palettes.has(style.background.color.toUpperCase())).toBe(true);
    }
  });

  it('the app glyph reads on its backdrop at text contrast (4.5 to 1)', () => {
    const { glyph, background } = ROLE_STYLES.app;
    expect(background).not.toBeNull();
    expect(contrastRatio(glyph, background?.color ?? '#000000')).toBeGreaterThanOrEqual(4.5);
  });

  it('the app icon has transparent corners, an opaque backdrop and a light iris', () => {
    const png = decodeFile('build/icon.png');
    expect(pixel(png, 0, 0)[3]).toBe(0);
    expect(pixel(png, 1023, 1023)[3]).toBe(0);
    expect(pixel(png, 150, 512)).toEqual([0x1a, 0x1a, 0x1a, 255]);
    expect(pixel(png, 512, 512)).toEqual([0xf2, 0xf2, 0xf2, 255]);
  });

  it.each(['trayTemplate', 'trayTemplate@2x'])('%s is black plus alpha only (macOS template)', (name) => {
    const png = decodeFile(`resources/tray/${name}.png`);
    for (let i = 0; i < png.rgba.length; i += 4) {
      if (png.rgba[i + 3] !== 0) expect([png.rgba[i], png.rgba[i + 1], png.rgba[i + 2]]).toEqual([0, 0, 0]);
    }
    expect(pixel(png, png.width / 2, png.height / 2)[3]).toBe(255);
    expect(pixel(png, 0, 0)[3]).toBe(0);
  });

  it.each([
    ['tray-on-light', [0x1a, 0x1a, 0x1a]],
    ['tray-on-dark', [0xf2, 0xf2, 0xf2]],
  ] as const)('%s draws its glyph in the right color on a transparent background', (name, rgb) => {
    for (const suffix of ['', '@2x']) {
      const png = decodeFile(`resources/tray/${name}${suffix}.png`);
      expect(pixel(png, 0, 0)[3]).toBe(0);
      expect(pixel(png, png.width / 2, png.height / 2)).toEqual([...rgb, 255]);
    }
  });

  it('the light and dark tray glyphs contrast with the surface they are for', () => {
    expect(contrastRatio(ROLE_STYLES['tray-on-light'].glyph, palette['neutral-50'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ROLE_STYLES['tray-on-dark'].glyph, palette['neutral-900'])).toBeGreaterThanOrEqual(4.5);
  });

  it('the tray glyph leaves a margin of at least one pixel at 16 px', () => {
    const png = decodeFile('resources/tray/tray-on-light.png');
    for (let i = 0; i < png.width; i += 1) {
      expect(pixel(png, i, 0)[3], `top row x=${i}`).toBe(0);
      expect(pixel(png, 0, i)[3], `left column y=${i}`).toBe(0);
      expect(pixel(png, png.width - 1, i)[3], `right column y=${i}`).toBe(0);
    }
  });
});

describe('DMG background', () => {
  it.each(BRAND_ARTWORK)('$file matches the generator and has the window size times its scale', (art) => {
    const png = decodeFile(art.file);
    expect([png.width, png.height]).toEqual([DMG_LAYOUT.width * art.scale, DMG_LAYOUT.height * art.scale]);
    expect([...png.rgba]).toEqual([...renderDmgBackground(art.scale)]);
  });

  it('the @2x image is the base image at twice the size and uses the electron-builder name', () => {
    expect(BRAND_ARTWORK.map((art) => art.file)).toEqual(['build/background.png', 'build/background@2x.png']);
    expect(BRAND_ARTWORK.map((art) => art.scale)).toEqual([1, 2]);
  });

  it('uses the light canvas token and a palette ink', () => {
    expect(DMG_LAYOUT.canvas.toUpperCase()).toBe(resolveToken(themes.light.canvas).toUpperCase());
    expect(Object.values(palette)).toContain(DMG_LAYOUT.arrow.toUpperCase());
  });

  it('the arrow reads on the canvas at non-text contrast (3 to 1)', () => {
    expect(contrastRatio(DMG_LAYOUT.arrow, DMG_LAYOUT.canvas)).toBeGreaterThanOrEqual(3);
  });

  it.each(BRAND_ARTWORK)('$file is opaque, canvas colored at the corners and under both icons', (art) => {
    const png = decodeFile(art.file);
    const at = (x: number, y: number) => pixel(png, Math.round(x * art.scale), Math.round(y * art.scale));
    const canvas = [0xe3, 0xe3, 0xe3, 255];
    expect(at(0, 0)).toEqual(canvas);
    expect(at(DMG_LAYOUT.width - 1, DMG_LAYOUT.height - 1)).toEqual(canvas);
    // Finder draws the icons here, so the image must stay empty.
    expect(at(DMG_LAYOUT.app.x, DMG_LAYOUT.app.y)).toEqual(canvas);
    expect(at(DMG_LAYOUT.applications.x, DMG_LAYOUT.applications.y)).toEqual(canvas);
  });

  it.each(BRAND_ARTWORK)('$file draws the arrow between the two icons, at their height', (art) => {
    const png = decodeFile(art.file);
    const middle = (DMG_LAYOUT.app.x + DMG_LAYOUT.applications.x) / 2;
    expect(pixel(png, middle * art.scale, DMG_LAYOUT.app.y * art.scale).slice(0, 3)).toEqual([0x5c, 0x5c, 0x5c]);
  });

  it('keeps the arrow clear of both icons by the gap', () => {
    const png = decodeFile('build/background.png');
    const half = DMG_LAYOUT.iconSize / 2;
    const inkColumns: number[] = [];
    for (let x = 0; x < png.width; x += 1) {
      for (let y = 0; y < png.height; y += 1) if (pixel(png, x, y)[0] !== 0xe3) inkColumns.push(x);
    }
    expect(Math.min(...inkColumns)).toBeGreaterThanOrEqual(DMG_LAYOUT.app.x + half);
    expect(Math.max(...inkColumns)).toBeLessThanOrEqual(DMG_LAYOUT.applications.x - half);
  });
});
