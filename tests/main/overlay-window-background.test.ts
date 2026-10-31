import { describe, expect, it } from 'vitest';
import {
  OVERLAY_WINDOW_BACKGROUND,
  TRANSPARENT_BACKGROUND,
} from '../../src/main/overlay/window-background';

describe('overlay window background', () => {
  it('is fully transparent, so the rounded panel shows no window-colored corners', () => {
    expect(OVERLAY_WINDOW_BACKGROUND).toBe(TRANSPARENT_BACKGROUND);
  });

  it('is in the #rrggbbaa form Electron accepts, with alpha 00', () => {
    expect(TRANSPARENT_BACKGROUND).toMatch(/^#[0-9A-Fa-f]{6}00$/);
  });
});
