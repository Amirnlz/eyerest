import { describe, expect, it } from 'vitest';
import { resolveToken, themes } from '../../src/design/tokens';
import {
  TRANSPARENT_BACKGROUND,
  overlayWindowBackground,
} from '../../src/main/overlay/window-background';

describe('overlayWindowBackground', () => {
  it.each([false, true])('surface layout is transparent (dark=%s)', (dark) => {
    expect(overlayWindowBackground('surface', dark)).toBe(
      TRANSPARENT_BACKGROUND,
    );
  });

  it('positioned layout uses the light canvas token in light theme', () => {
    expect(overlayWindowBackground('positioned', false)).toBe(
      resolveToken(themes.light.canvas),
    );
  });

  it('positioned layout uses the dark canvas token in dark theme', () => {
    expect(overlayWindowBackground('positioned', true)).toBe(
      resolveToken(themes.dark.canvas),
    );
  });

  it('never returns white in dark theme (no flash before first paint)', () => {
    expect(overlayWindowBackground('positioned', true).toLowerCase()).not.toBe(
      '#ffffff',
    );
  });

  it('returns an opaque color for positioned and a fully transparent one for surface', () => {
    expect(overlayWindowBackground('positioned', false)).toMatch(
      /^#[0-9A-Fa-f]{6}$/,
    );
    expect(TRANSPARENT_BACKGROUND).toMatch(/^#[0-9A-Fa-f]{6}00$/);
  });
});
