import { describe, expect, it } from 'vitest';
import {
  DIM_LEVEL,
  OVERLAY_LEVEL,
  WINDOW_LEVELS,
  isLevelBelow,
} from '../../src/main/window-levels';

describe('window levels', () => {
  it('puts the dim layer below the overlay', () => {
    expect(isLevelBelow(DIM_LEVEL, OVERLAY_LEVEL)).toBe(true);
    expect(isLevelBelow(OVERLAY_LEVEL, DIM_LEVEL)).toBe(false);
  });

  it('the overlay uses the highest level', () => {
    expect(WINDOW_LEVELS.at(-1)).toBe(OVERLAY_LEVEL);
  });

  it('a level is not below itself', () => {
    expect(isLevelBelow('floating', 'floating')).toBe(false);
  });

  it('orders levels as Electron documents them', () => {
    expect(isLevelBelow('normal', 'floating')).toBe(true);
    expect(isLevelBelow('status', 'pop-up-menu')).toBe(true);
    expect(isLevelBelow('pop-up-menu', 'screen-saver')).toBe(true);
  });
});
