import { expect, test } from '@playwright/test';
import { expectColor, openGallery, style, themeNames, tokenColor } from './gallery-helpers';

/**
 * Computed-style checks for the primitives. jsdom cannot resolve CSS, so these are the only tests
 * that prove the rules reach the page (closes V6 and the unchecked rows of section 8).
 * Concentric radii and values come from docs/design-system.md.
 */

test('the gallery loads without page errors and with the bundled font', async ({ page }) => {
  const errors = await openGallery(page, 'light');
  expect(await page.evaluate(() => document.fonts.check("1rem 'Manrope Variable'"))).toBe(true);
  expect(await style(page, 'text-body-primary', 'font-family')).toContain('Manrope Variable');
  expect(errors).toEqual([]);
});

test.describe('Button', () => {
  test('concentric radius inside a Surface (section 8 table)', async ({ page }) => {
    await openGallery(page, 'light');
    const cases: readonly (readonly [string, string])[] = [
      ['concentric-md-xs', '7px'],
      ['concentric-lg-sm', '11px'],
      ['concentric-sm-xs', '0px'],
      ['concentric-lg-md', '16px'],
      ['concentric-nested-panel-well', '7px'],
      ['concentric-nested-well-panel', '16px'],
    ];
    for (const [id, expected] of cases) {
      const radius = await page
        .getByTestId(id)
        .getByRole('button')
        .evaluate((button) => getComputedStyle(button).borderTopLeftRadius);
      expect(radius, id).toBe(expected);
    }
  });

  test('optical alignment: 2px less padding on the icon side only', async ({ page }) => {
    await openGallery(page, 'light');
    const cases: readonly (readonly [string, string, string])[] = [
      ['button-secondary-sm-default', '16px', '16px'],
      ['button-secondary-sm-icon-start', '14px', '16px'],
      ['button-secondary-sm-icon-end', '16px', '14px'],
      ['button-secondary-md-default', '24px', '24px'],
      ['button-secondary-md-icon-start', '22px', '24px'],
      ['button-secondary-md-icon-end', '24px', '22px'],
    ];
    for (const [id, left, right] of cases) {
      expect(await style(page, id, 'padding-left'), `${id} left`).toBe(left);
      expect(await style(page, id, 'padding-right'), `${id} right`).toBe(right);
    }
  });

  test('both sizes meet the WCAG 2.2 minimum target of 24px (V7)', async ({ page }) => {
    await openGallery(page, 'light');
    for (const id of ['button-secondary-sm-default', 'button-secondary-md-default']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(24);
      expect(box?.width ?? 0, id).toBeGreaterThanOrEqual(24);
    }
  });

  for (const theme of themeNames) {
    test(`keyboard focus draws the ring from the token (${theme})`, async ({ page }) => {
      await openGallery(page, theme);
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toHaveAttribute('data-testid', 'button-primary-sm-default');

      const ring = await focused.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          style: computed.outlineStyle,
          width: computed.outlineWidth,
          offset: computed.outlineOffset,
          color: computed.outlineColor,
        };
      });
      expect(ring.style).toBe('solid');
      expect(ring.width).toBe('2px');
      expect(ring.offset).toBe('3px');
      expectColor(ring.color, tokenColor(theme, 'focus-ring'));
    });
  }

  test('a mouse click draws no focus ring (focus-visible only)', async ({ page }) => {
    await openGallery(page, 'light');
    await page.getByTestId('button-secondary-md-default').click();
    expect(await style(page, 'button-secondary-md-default', 'outline-style')).toBe('none');
  });

  test('press scales to 0.96, but never a disabled or static button', async ({ page }) => {
    await openGallery(page, 'light');
    const pressed = async (id: string) => {
      const target = page.getByTestId(id);
      const box = await target.boundingBox();
      if (!box) throw new Error(`${id} has no box`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(250);
      const scale = await style(page, id, 'scale');
      await page.mouse.up();
      return scale;
    };

    expect(await pressed('button-secondary-md-default')).toBe('0.96');
    expect(await pressed('button-secondary-md-static')).toBe('none');
    expect(await pressed('button-secondary-md-disabled')).toBe('none');
  });

  test('disabled uses the disabled opacity and a not-allowed cursor', async ({ page }) => {
    await openGallery(page, 'light');
    expect(await style(page, 'button-primary-md-disabled', 'opacity')).toBe('0.5');
    expect(await style(page, 'button-primary-md-disabled', 'cursor')).toBe('not-allowed');
  });

  test('reduced motion drops the scale transition and zeroes the movement tokens', async ({ page }) => {
    await openGallery(page, 'light');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await style(page, 'button-secondary-md-default', 'transition-property')).toBe(
      'box-shadow, background-color',
    );
    const offset = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--er-motion-enter-offset').trim(),
    );
    expect(offset).toBe('0rem');
  });

  test('forced colors keeps a visible border, since shadows are removed', async ({ page }) => {
    await openGallery(page, 'light');
    await page.emulateMedia({ forcedColors: 'active' });
    for (const id of ['button-secondary-md-default', 'button-quiet-md-default']) {
      const color = await style(page, id, 'border-top-color');
      expect(color, id).not.toBe('rgba(0, 0, 0, 0)');
      expect(await style(page, id, 'border-top-width'), id).toBe('1px');
    }
  });
});

test.describe('Surface and text', () => {
  for (const theme of themeNames) {
    test(`raised surfaces cast a shadow, the canvas does not (${theme})`, async ({ page }) => {
      await openGallery(page, theme);
      expect(await style(page, 'surface-raised-md', 'box-shadow')).not.toBe('none');
      expect(await style(page, 'surface-inset-md', 'box-shadow')).toContain('inset');
    });

    test(`text tones use the token colors (${theme})`, async ({ page }) => {
      await openGallery(page, theme);
      expectColor(await style(page, 'text-body-primary', 'color'), tokenColor(theme, 'text-primary'));
      expectColor(await style(page, 'text-body-secondary', 'color'), tokenColor(theme, 'text-secondary'));
    });
  }

  test('type roles follow the scale and the countdown has tabular numerals', async ({ page }) => {
    await openGallery(page, 'light');
    const sizes = await Promise.all(
      ['display', 'title', 'body', 'label', 'caption'].map(async (role) =>
        parseFloat(await style(page, `text-${role}-primary`, 'font-size')),
      ),
    );
    expect(sizes[0]).toBeGreaterThan(sizes[1] ?? Infinity);
    expect(sizes[1]).toBeGreaterThan(sizes[2] ?? Infinity);
    expect(sizes[2]).toBeGreaterThanOrEqual(sizes[4] ?? Infinity);

    const numerals = await page
      .getByTestId('countdown-20')
      .locator('span')
      .evaluate((element) => getComputedStyle(element).fontVariantNumeric);
    expect(numerals).toContain('tabular-nums');
  });
});

test.describe('Photo', () => {
  const expected = { light: [0, 0, 0, 0.1], dark: [255, 255, 255, 0.1] } as const;

  for (const theme of themeNames) {
    test(`content images get a 1px inset outline in pure ${theme === 'light' ? 'black' : 'white'} at 10% (${theme})`, async ({ page }) => {
      await openGallery(page, theme);
      expect(await style(page, 'photo-default', 'outline-style')).toBe('solid');
      expect(await style(page, 'photo-default', 'outline-width')).toBe('1px');
      expect(await style(page, 'photo-default', 'outline-offset')).toBe('-1px');
      expectColor(await style(page, 'photo-default', 'outline-color'), expected[theme]);
    });
  }

  test('artwork skips the outline', async ({ page }) => {
    await openGallery(page, 'light');
    expect(await style(page, 'photo-artwork', 'outline-style')).toBe('none');
  });
});

test.describe('Icon and ProgressRing', () => {
  test('icon strokes keep their pixel width at every size', async ({ page }) => {
    await openGallery(page, 'light');
    for (const size of ['sm', 'md', 'lg']) {
      const effect = await page
        .getByTestId(`icon-eye-${size}`)
        .locator('path')
        .first()
        .evaluate((path) => getComputedStyle(path).vectorEffect);
      expect(effect, size).toBe('non-scaling-stroke');
    }
  });

  test('icons inherit the text color, so state comes from CSS', async ({ page }) => {
    await openGallery(page, 'dark');
    expectColor(await style(page, 'icon-eye-md', 'color'), tokenColor('dark', 'text-primary'));
  });

  test('the ring draws nothing at 0 percent and the full circle at 100', async ({ page }) => {
    await openGallery(page, 'light');
    const dash = (id: string) =>
      page
        .getByTestId(id)
        .locator('.er-ring__progress')
        .evaluate((circle) => {
          const computed = getComputedStyle(circle);
          return { array: parseFloat(computed.strokeDasharray), offset: parseFloat(computed.strokeDashoffset) };
        });
    const empty = await dash('ring-0');
    const full = await dash('ring-100');
    expect(empty.offset).toBeCloseTo(empty.array, 1);
    expect(full.offset).toBeCloseTo(0, 1);
  });

  test('ring sizes ascend', async ({ page }) => {
    await openGallery(page, 'light');
    const width = async (size: string) =>
      (await page.getByTestId(`ring-size-${size}`).boundingBox())?.width ?? 0;
    expect(await width('sm')).toBeLessThan(await width('md'));
    expect(await width('md')).toBeLessThan(await width('lg'));
  });
});
