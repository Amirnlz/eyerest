import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OVERLAY_MARGIN,
  DEFAULT_OVERLAY_SIZE,
  computeOverlayBounds,
  computeSurfaceBounds,
  type Rect,
} from '../../src/main/overlay/bounds';
import { OVERLAY_MARGIN, OVERLAY_SIZE } from '../../src/shared/overlay-layout';

const size = { width: 360, height: 220 };
const margin = 16;

const rightEdge = (r: Rect) => r.x + r.width;
const bottomEdge = (r: Rect) => r.y + r.height;

describe('computeOverlayBounds', () => {
  it('anchors to the top-right of a full HD display', () => {
    expect(computeOverlayBounds({ x: 0, y: 0, width: 1920, height: 1080 }, size, margin)).toEqual({
      x: 1920 - 16 - 360,
      y: 16,
      width: 360,
      height: 220,
    });
  });

  it('respects a bottom taskbar (smaller work area height)', () => {
    const bounds = computeOverlayBounds({ x: 0, y: 0, width: 1920, height: 1040 }, size, margin);
    expect(bounds).toMatchObject({ x: 1544, y: 16 });
  });

  it('respects a top bar such as the macOS menu bar or a top taskbar', () => {
    const bounds = computeOverlayBounds({ x: 0, y: 25, width: 1920, height: 1055 }, size, margin);
    expect(bounds.y).toBe(25 + 16);
  });

  it('respects a left dock (work area starts at a positive x)', () => {
    const bounds = computeOverlayBounds({ x: 70, y: 0, width: 1850, height: 1080 }, size, margin);
    expect(rightEdge(bounds)).toBe(70 + 1850 - 16);
  });

  it('respects a right-side taskbar (work area ends before the screen edge)', () => {
    const bounds = computeOverlayBounds({ x: 0, y: 0, width: 1860, height: 1080 }, size, margin);
    expect(rightEdge(bounds)).toBe(1860 - 16);
  });

  it('handles a work area at a non-zero origin', () => {
    const bounds = computeOverlayBounds({ x: 1920, y: -200, width: 2560, height: 1440 }, size, margin);
    expect(bounds.x).toBe(1920 + 2560 - 16 - 360);
    expect(bounds.y).toBe(-200 + 16);
  });

  it('works in device-independent pixels, so scaled displays need no special case', () => {
    // 4K at 200% reports a 1920x1080 work area in DIP: same result as full HD.
    const scaled = computeOverlayBounds({ x: 0, y: 0, width: 1920, height: 1080 }, size, margin);
    const hd = computeOverlayBounds({ x: 0, y: 0, width: 1920, height: 1080 }, size, margin);
    expect(scaled).toEqual(hd);
  });

  it('returns whole numbers for fractional work areas (125% scaling)', () => {
    const bounds = computeOverlayBounds(
      { x: 0, y: 0, width: 1536, height: 816.8 },
      { width: 360, height: 220.4 },
      15.6,
    );
    for (const value of Object.values(bounds)) expect(Number.isInteger(value)).toBe(true);
  });

  describe('small screens', () => {
    it('shrinks the window to fit inside the margins', () => {
      const bounds = computeOverlayBounds({ x: 0, y: 0, width: 300, height: 200 }, size, margin);
      expect(bounds).toEqual({ x: 16, y: 16, width: 268, height: 168 });
    });

    it('drops the margin when it cannot fit at all', () => {
      const bounds = computeOverlayBounds({ x: 0, y: 0, width: 20, height: 20 }, size, margin);
      expect(bounds).toEqual({ x: 0, y: 0, width: 20, height: 20 });
    });

    it('never returns a negative size, even for an empty work area', () => {
      const bounds = computeOverlayBounds({ x: 0, y: 0, width: 0, height: 0 }, size, margin);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });
  });

  describe('margin handling', () => {
    it('supports a zero margin', () => {
      const bounds = computeOverlayBounds({ x: 0, y: 0, width: 1000, height: 800 }, size, 0);
      expect(bounds).toEqual({ x: 640, y: 0, width: 360, height: 220 });
    });

    it.each([-10, Number.NaN, Number.NEGATIVE_INFINITY])('treats margin %s as 0', (bad) => {
      const bounds = computeOverlayBounds({ x: 0, y: 0, width: 1000, height: 800 }, size, bad);
      expect(bounds).toEqual({ x: 640, y: 0, width: 360, height: 220 });
    });
  });

  it('always stays inside the work area', () => {
    const widths = [0, 10, 200, 360, 392, 800, 1920, 3840];
    const heights = [0, 10, 150, 220, 252, 600, 1080, 2160];
    const origins = [-1920, 0, 70];
    const margins = [0, 16, 400];

    for (const width of widths) {
      for (const height of heights) {
        for (const origin of origins) {
          for (const m of margins) {
            const area: Rect = { x: origin, y: origin, width, height };
            const bounds = computeOverlayBounds(area, size, m);
            expect(bounds.x).toBeGreaterThanOrEqual(area.x);
            expect(bounds.y).toBeGreaterThanOrEqual(area.y);
            expect(rightEdge(bounds)).toBeLessThanOrEqual(rightEdge(area));
            expect(bottomEdge(bounds)).toBeLessThanOrEqual(bottomEdge(area));
            expect(bounds.width).toBeGreaterThanOrEqual(0);
            expect(bounds.height).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it('exposes sane defaults', () => {
    expect(DEFAULT_OVERLAY_SIZE.width).toBeGreaterThan(0);
    expect(DEFAULT_OVERLAY_SIZE.height).toBeGreaterThan(0);
    expect(DEFAULT_OVERLAY_MARGIN).toBeGreaterThanOrEqual(0);
  });
});

describe('computeSurfaceBounds', () => {
  it('covers the whole work area', () => {
    expect(computeSurfaceBounds({ x: 0, y: 0, width: 1920, height: 1080 })).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });
  });

  it('keeps the work-area offset (bars and docks)', () => {
    expect(computeSurfaceBounds({ x: 70, y: 32, width: 1850, height: 1048 })).toEqual({
      x: 70,
      y: 32,
      width: 1850,
      height: 1048,
    });
  });

  it('returns whole numbers for fractional work areas', () => {
    const bounds = computeSurfaceBounds({ x: 0.4, y: 31.6, width: 1536.9, height: 816.8 });
    expect(bounds).toEqual({ x: 0, y: 32, width: 1536, height: 816 });
  });

  it('never returns a negative size', () => {
    const bounds = computeSurfaceBounds({ x: 0, y: 0, width: -5, height: -1 });
    expect(bounds.width).toBe(0);
    expect(bounds.height).toBe(0);
  });
});

describe('shared layout constants', () => {
  it('are the defaults used for the positioned window', () => {
    expect(DEFAULT_OVERLAY_SIZE).toBe(OVERLAY_SIZE);
    expect(DEFAULT_OVERLAY_MARGIN).toBe(OVERLAY_MARGIN);
  });
});
