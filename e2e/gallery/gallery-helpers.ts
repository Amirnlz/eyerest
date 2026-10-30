import { expect, type Page } from '@playwright/test';
import { resolveToken, themes, type ColorTokenName, type ThemeName } from '../../src/design/tokens';

export const themeNames: readonly ThemeName[] = ['light', 'dark'];

/** Opens the gallery in a theme and waits for fonts. Returns the page errors seen so far, live. */
export async function openGallery(page: Page, theme: ThemeName): Promise<Error[]> {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto(`/gallery.html?theme=${theme}`);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.getByTestId('section-buttons')).toBeVisible();
  return errors;
}

export type Rgba = readonly [number, number, number, number];

/** Parses `rgb(r, g, b)`, `rgba(r, g, b, a)` and `color(srgb ...)` as Chromium serializes them. */
export function parseColor(value: string): Rgba {
  const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
  if (value.startsWith('color(srgb')) {
    const [r = 0, g = 0, b = 0, a = 1] = numbers;
    return [r * 255, g * 255, b * 255, a];
  }
  const [r = 0, g = 0, b = 0, a = 1] = numbers;
  return [r, g, b, a];
}

/** A design token as the color Chromium would compute for it. */
export function tokenColor(theme: ThemeName, name: ColorTokenName): Rgba {
  const hex = resolveToken(themes[theme][name]).slice(1);
  const channel = (start: number) => parseInt(hex.slice(start, start + 2), 16);
  const alpha = hex.length === 8 ? channel(6) / 255 : 1;
  return [channel(0), channel(2), channel(4), alpha];
}

export function expectColor(actual: string, expected: Rgba): void {
  const parsed = parseColor(actual);
  for (let i = 0; i < 3; i++) {
    expect(Math.abs((parsed[i] ?? 0) - (expected[i] ?? 0))).toBeLessThanOrEqual(2);
  }
  expect(Math.abs(parsed[3] - expected[3])).toBeLessThanOrEqual(0.03);
}

/** Computed style of one property on the element with this test id. */
export function style(page: Page, testId: string, property: string): Promise<string> {
  return page.getByTestId(testId).evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  );
}
