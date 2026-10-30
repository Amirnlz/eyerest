/**
 * Icon set. Data only: drawn on a 24 by 24 grid, outline by default. No colors live here: the
 * component paints everything with `currentColor`. Add an icon by adding an entry, then a test
 * case follows from the registry loops.
 */

export type IconShape =
  | { readonly kind: 'path'; readonly d: string; readonly fillable?: boolean }
  | {
      readonly kind: 'circle';
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      readonly fillable?: boolean;
    };

export interface IconDefinition {
  readonly shapes: readonly IconShape[];
  /** Direction-bound glyphs flip in right-to-left layouts. Logos, clocks and playback do not. */
  readonly mirrorInRtl: boolean;
}

export const ICON_GRID = 24;

export const iconNames = ['eye', 'sun', 'moon', 'skip', 'postpone'] as const;
export type IconName = (typeof iconNames)[number];

export const icons: Readonly<Record<IconName, IconDefinition>> = {
  eye: {
    shapes: [
      { kind: 'path', d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z' },
      { kind: 'circle', cx: 12, cy: 12, r: 3, fillable: true },
    ],
    mirrorInRtl: false,
  },
  sun: {
    shapes: [
      { kind: 'circle', cx: 12, cy: 12, r: 4, fillable: true },
      {
        kind: 'path',
        d:
          'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2' +
          'M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
      },
    ],
    mirrorInRtl: false,
  },
  moon: {
    shapes: [
      {
        kind: 'path',
        d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
        fillable: true,
      },
    ],
    mirrorInRtl: false,
  },
  // Points toward the end of the rest. Mirrors in RTL, where "forward" points left.
  skip: {
    shapes: [
      { kind: 'path', d: 'M5 5l10 7-10 7z', fillable: true },
      { kind: 'path', d: 'M19 5v14' },
    ],
    mirrorInRtl: true,
  },
  // A clock face: no fill variant, because filling the circle would hide the hands.
  postpone: {
    shapes: [
      { kind: 'circle', cx: 12, cy: 12, r: 9 },
      { kind: 'path', d: 'M12 7v5l3 2' },
    ],
    mirrorInRtl: false,
  },
};
