import { OVERLAY_MARGIN, OVERLAY_SIZE } from '../../shared/overlay-layout';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export const DEFAULT_OVERLAY_SIZE: Size = OVERLAY_SIZE;
export const DEFAULT_OVERLAY_MARGIN = OVERLAY_MARGIN;

/**
 * Bounds for the `surface` layout: the whole work area, whole numbers only.
 * The panel's top-right position is then done by CSS in the renderer.
 */
export function computeSurfaceBounds(workArea: Rect): Rect {
  return {
    x: Math.round(workArea.x),
    y: Math.round(workArea.y),
    width: Math.max(0, Math.floor(workArea.width)),
    height: Math.max(0, Math.floor(workArea.height)),
  };
}

/**
 * Top-right bounds for the overlay inside a display's work area.
 *
 * - Everything is in device-independent pixels (what Electron's `workArea`
 *   and `setBounds` use), so display scale factor needs no special handling.
 * - `workArea` already excludes taskbars, docks and menu bars on every edge,
 *   and may start at a non-zero x/y.
 * - On a screen too small for the requested size plus margins, the window is
 *   shrunk to fit; if even the margins do not fit, the margin is dropped.
 * - Output values are whole numbers, because fractional bounds are rounded
 *   differently per OS.
 */
export function computeOverlayBounds(
  workArea: Rect,
  size: Size,
  margin: number,
): Rect {
  const areaWidth = Math.max(0, Math.floor(workArea.width));
  const areaHeight = Math.max(0, Math.floor(workArea.height));
  const areaX = Math.round(workArea.x);
  const areaY = Math.round(workArea.y);

  const wanted = Number.isFinite(margin) ? Math.max(0, Math.round(margin)) : 0;
  const effectiveMargin =
    2 * wanted < Math.min(areaWidth, areaHeight) ? wanted : 0;

  const width = Math.min(
    Math.round(size.width),
    areaWidth - 2 * effectiveMargin,
  );
  const height = Math.min(
    Math.round(size.height),
    areaHeight - 2 * effectiveMargin,
  );

  return {
    x: areaX + areaWidth - effectiveMargin - width,
    y: areaY + effectiveMargin,
    width,
    height,
  };
}
