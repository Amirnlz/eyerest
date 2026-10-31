/**
 * Brand icon generator. The mark is the design system's `eye` glyph (`icons.eye`, 24 by 24 grid):
 * an almond outline with a filled iris. This file turns it into the PNG files the app ships:
 * the app icon and the tray icon set. Nothing here is Electron or DOM; it is a pure function from
 * a spec to RGBA pixels, so a test can regenerate every file and compare it with the committed one.
 * It also draws the DMG window background (`BRAND_ARTWORK`).
 *
 * Pixels come from a signed distance field with a one-pixel coverage ramp. No dependency and no
 * rasterizer binary, so the output is the same on every machine. Colors are palette values
 * (tests/design/brand-icons.test.ts checks that).
 *
 * This file imports only Node built-ins, so it also runs under `node --experimental-strip-types`.
 * Regenerate the files with `npm run icons`.
 */

import { deflateSync, inflateSync } from 'node:zlib';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Must equal `icons.eye.shapes[0].d` in `src/renderer/ui/icons.ts` (a test enforces it). */
export const EYE_PATH = 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z';
/** Must equal the circle in `icons.eye.shapes[1]` (a test enforces it). */
export const EYE_IRIS = Object.freeze({ cx: 12, cy: 12, r: 3 });

const GRID = 24;
/** Width of the almond centerline on the grid (x from 2 to 22). The stroke adds to it. */
const GLYPH_GRID_WIDTH = 20;

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/**
 * Flattens a path made of `M`, `s`, `S` and `z` into a closed polyline. Anything else throws:
 * the parser exists for the eye outline only, and a new command should be a conscious change.
 */
export function flattenPath(d: string, stepsPerCurve = 24): Point[] {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  let index = 0;
  let current: Point = { x: 0, y: 0 };
  let start: Point = current;
  let lastControl: Point | null = null;
  const points: Point[] = [];

  const number = (): number => {
    const token = tokens[index++];
    const value = token === undefined ? Number.NaN : Number(token);
    if (Number.isNaN(value)) throw new Error(`Expected a number in path: ${d}`);
    return value;
  };
  const nextIsNumber = (): boolean => {
    const token = tokens[index];
    return token !== undefined && !/^[A-Za-z]$/.test(token);
  };

  while (index < tokens.length) {
    const command = tokens[index++];
    switch (command) {
      case 'M': {
        const x = number();
        const y = number();
        current = { x, y };
        start = current;
        points.push(current);
        lastControl = null;
        break;
      }
      case 's':
      case 'S': {
        const relative = command === 's';
        do {
          const first: Point = lastControl
            ? { x: 2 * current.x - lastControl.x, y: 2 * current.y - lastControl.y }
            : current;
          const ox = relative ? current.x : 0;
          const oy = relative ? current.y : 0;
          const second: Point = { x: ox + number(), y: oy + number() };
          const end: Point = { x: ox + number(), y: oy + number() };
          for (let step = 1; step <= stepsPerCurve; step += 1) {
            points.push(cubicAt(current, first, second, end, step / stepsPerCurve));
          }
          current = end;
          lastControl = second;
        } while (nextIsNumber());
        break;
      }
      case 'z':
      case 'Z':
        current = start;
        lastControl = null;
        break;
      default:
        throw new Error(`Unsupported path command "${String(command)}" in: ${d}`);
    }
  }
  return points;
}

function distanceToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSquared));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

export type IconRole = 'app' | 'tray-template' | 'tray-on-light' | 'tray-on-dark';

export interface IconSpec {
  /** Repo-relative path of the PNG. */
  readonly file: string;
  /** Edge length in pixels. The icon is square. */
  readonly size: number;
  readonly role: IconRole;
}

interface RoleStyle {
  /** Glyph color, a palette value. */
  readonly glyph: string;
  /** Share of the icon width the almond covers, outline included. */
  readonly glyphWidth: number;
  /** Outline width and iris radius, in grid units. */
  readonly stroke: number;
  readonly iris: number;
  /** Rounded square behind the glyph, as shares of the icon size. `null` for a bare glyph. */
  readonly background: { readonly color: string; readonly inset: number; readonly radius: number } | null;
}

export const ROLE_STYLES: Readonly<Record<IconRole, RoleStyle>> = {
  // Inset and radius follow the macOS icon grid (824 of 1024, corner radius about 185).
  app: {
    glyph: '#F2F2F2',
    glyphWidth: 0.58,
    stroke: 2,
    iris: EYE_IRIS.r,
    background: { color: '#1A1A1A', inset: 100 / 1024, radius: 185 / 1024 },
  },
  // macOS template image: black plus alpha only. The system recolors it for the menu bar.
  'tray-template': { glyph: '#000000', glyphWidth: 0.875, stroke: 2.6, iris: 3.2, background: null },
  'tray-on-light': { glyph: '#1A1A1A', glyphWidth: 0.875, stroke: 2.6, iris: 3.2, background: null },
  'tray-on-dark': { glyph: '#F2F2F2', glyphWidth: 0.875, stroke: 2.6, iris: 3.2, background: null },
};

/** Every PNG the app ships. The `@2x` files are the same icon at twice the pixels. */
export const BRAND_ICONS: readonly IconSpec[] = [
  { file: 'build/icon.png', size: 1024, role: 'app' },
  { file: 'resources/tray/trayTemplate.png', size: 16, role: 'tray-template' },
  { file: 'resources/tray/trayTemplate@2x.png', size: 32, role: 'tray-template' },
  { file: 'resources/tray/tray-on-light.png', size: 16, role: 'tray-on-light' },
  { file: 'resources/tray/tray-on-light@2x.png', size: 32, role: 'tray-on-light' },
  { file: 'resources/tray/tray-on-dark.png', size: 16, role: 'tray-on-dark' },
  { file: 'resources/tray/tray-on-dark@2x.png', size: 32, role: 'tray-on-dark' },
];

function hexToRgb(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

const coverage = (signedDistancePx: number): number => Math.max(0, Math.min(1, 0.5 - signedDistancePx));

/** Straight (non-premultiplied) RGBA, row by row, `size * size * 4` bytes. */
export function renderIcon(spec: IconSpec): Uint8Array {
  const style = ROLE_STYLES[spec.role];
  const outline = flattenPath(EYE_PATH);
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const bounds = {
    minX: Math.min(...xs) - style.stroke,
    maxX: Math.max(...xs) + style.stroke,
    minY: Math.min(...ys) - style.stroke,
    maxY: Math.max(...ys) + style.stroke,
  };

  const size = spec.size;
  const scale = (size * style.glyphWidth) / (GLYPH_GRID_WIDTH + style.stroke);
  const glyphColor = hexToRgb(style.glyph);
  const backgroundColor = style.background ? hexToRgb(style.background.color) : null;
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;

      // Backdrop: a rounded square.
      let backCoverage = 0;
      if (style.background) {
        const half = size / 2 - style.background.inset * size;
        const radius = style.background.radius * size;
        const qx = Math.abs(px - size / 2) - (half - radius);
        const qy = Math.abs(py - size / 2) - (half - radius);
        const distance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
        backCoverage = coverage(distance);
      }

      // Glyph: the outline stroke and the iris, as one distance field in grid units.
      const gx = GRID / 2 + (px - size / 2) / scale;
      const gy = GRID / 2 + (py - size / 2) / scale;
      let glyphCoverage = 0;
      if (gx >= bounds.minX && gx <= bounds.maxX && gy >= bounds.minY && gy <= bounds.maxY) {
        let nearest = Number.POSITIVE_INFINITY;
        for (let i = 0; i < outline.length; i += 1) {
          const a = outline[i] as Point;
          const b = outline[(i + 1) % outline.length] as Point;
          nearest = Math.min(nearest, distanceToSegment(gx, gy, a, b));
        }
        const stroke = nearest - style.stroke / 2;
        const iris = Math.hypot(gx - EYE_IRIS.cx, gy - EYE_IRIS.cy) - style.iris;
        glyphCoverage = coverage(Math.min(stroke, iris) * scale);
      }

      // Glyph over backdrop.
      const alpha = glyphCoverage + backCoverage * (1 - glyphCoverage);
      const offset = (y * size + x) * 4;
      if (alpha > 0) {
        for (let channel = 0; channel < 3; channel += 1) {
          const glyph = glyphColor[channel] as number;
          const back = backgroundColor ? (backgroundColor[channel] as number) : 0;
          const value = (glyph * glyphCoverage + back * backCoverage * (1 - glyphCoverage)) / alpha;
          pixels[offset + channel] = Math.round(value);
        }
      }
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

/**
 * DMG window background (macOS installer). The window is drawn by Finder, so the icons, their
 * labels and the title bar are not part of the image: it carries only the canvas and an arrow from
 * the app to the Applications link. The positions below are written to `electron-builder.json`
 * (a test compares them), so the arrow always sits between the two icons.
 */
export const DMG_LAYOUT = Object.freeze({
  width: 540,
  height: 380,
  iconSize: 80,
  app: Object.freeze({ x: 130, y: 220 }),
  applications: Object.freeze({ x: 410, y: 220 }),
  /** Free space between an icon and the arrow end. */
  arrowGap: 16,
  arrowStroke: 3,
  arrowHead: 14,
  canvas: '#E3E3E3',
  arrow: '#5C5C5C',
});

export interface ArtworkSpec {
  readonly file: string;
  /** 1 for the base image, 2 for the Retina `@2x` image. */
  readonly scale: 1 | 2;
}

export const BRAND_ARTWORK: readonly ArtworkSpec[] = [
  { file: 'build/background.png', scale: 1 },
  { file: 'build/background@2x.png', scale: 2 },
];

/** Straight RGBA for the DMG background at the given scale, `width * scale` by `height * scale`. */
export function renderDmgBackground(scale: 1 | 2): Uint8Array {
  const layout = DMG_LAYOUT;
  const width = layout.width * scale;
  const height = layout.height * scale;
  const canvas = hexToRgb(layout.canvas);
  const ink = hexToRgb(layout.arrow);

  const startX = layout.app.x + layout.iconSize / 2 + layout.arrowGap;
  const endX = layout.applications.x - layout.iconSize / 2 - layout.arrowGap;
  const y = layout.app.y;
  const arm = layout.arrowHead * Math.SQRT1_2;
  const tip: Point = { x: endX, y };
  const segments: readonly (readonly [Point, Point])[] = [
    [{ x: startX, y }, tip],
    [tip, { x: endX - arm, y: y - arm }],
    [tip, { x: endX - arm, y: y + arm }],
  ];

  const pixels = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      // Work in 1x units so one layout serves both scales.
      const px = (column + 0.5) / scale;
      const py = (row + 0.5) / scale;
      let nearest = Number.POSITIVE_INFINITY;
      for (const [a, b] of segments) nearest = Math.min(nearest, distanceToSegment(px, py, a, b));
      // Round caps: a segment's distance already rounds its ends.
      const ink01 = coverage((nearest - layout.arrowStroke / 2) * scale);
      const offset = (row * width + column) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const back = canvas[channel] as number;
        const front = ink[channel] as number;
        pixels[offset + channel] = Math.round(front * ink01 + back * (1 - ink01));
      }
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

// PNG, 8-bit RGBA, no interlace, filter type 0 on every row.

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) throw new Error('RGBA length does not match the size');
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header[8] = 8; // bit depth
  header[9] = 6; // color type: RGBA

  const stride = width * 4;
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const parts = [
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

/** Reads what `encodePng` writes: 8-bit RGBA, filter 0. Anything else throws. */
export function decodePng(bytes: Uint8Array): DecodedPng {
  if (PNG_SIGNATURE.some((value, i) => bytes[i] !== value)) throw new Error('Not a PNG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0;
  let height = 0;
  const idat: Uint8Array[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('Only 8-bit RGBA, not interlaced');
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    if (raw[y * (stride + 1)] !== 0) throw new Error('Only filter type 0 is supported');
    rgba.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), y * stride);
  }
  return { width, height, rgba };
}
