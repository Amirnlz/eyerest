/** Pure color math. No DOM, no Electron. Used by tokens validation and contrast tests. */

export type Rgb = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX8 = /^#[0-9a-fA-F]{8}$/;

export function isHex6(value: string): boolean {
  return HEX6.test(value);
}

export function isHex8(value: string): boolean {
  return HEX8.test(value);
}

export function parseHex(value: string): Rgb {
  if (!HEX6.test(value) && !HEX8.test(value)) {
    throw new Error(`Invalid hex color: ${value}`);
  }
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

/** True when r, g and b are equal: the palette allows only the black-white axis. */
export function isAchromatic(value: string): boolean {
  const { r, g, b } = parseHex(value);
  return r === g && g === b;
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(value: string): number {
  const { r, g, b } = parseHex(value);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio, 1 to 21. Both colors must be opaque (`#rrggbb`). */
export function contrastRatio(a: string, b: string): number {
  if (!HEX6.test(a) || !HEX6.test(b)) {
    throw new Error(`Contrast needs opaque colors, got ${a} and ${b}`);
  }
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
