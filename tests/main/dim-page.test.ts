import { describe, expect, it } from 'vitest';
import {
  DIM_COLOR,
  DIM_FADE_IN_MS,
  DIM_PAGE_HTML,
  DIM_PAGE_URL,
  DIM_VISIBLE_CLASS,
} from '../../src/main/dim/dim-page';

describe('dim page', () => {
  it('is a standards-mode document', () => {
    expect(DIM_PAGE_HTML.startsWith('<!doctype html>')).toBe(true);
  });

  it('runs no scripts', () => {
    expect(DIM_PAGE_HTML.toLowerCase()).not.toContain('<script');
  });

  it('is hidden until the visible class is set, then fades in', () => {
    expect(DIM_PAGE_HTML).toContain('opacity:0');
    expect(DIM_PAGE_HTML).toContain(`body.${DIM_VISIBLE_CLASS}{opacity:1}`);
    expect(DIM_PAGE_HTML).toContain(`transition:opacity ${DIM_FADE_IN_MS}ms`);
  });

  it('animates opacity only', () => {
    const transitions = DIM_PAGE_HTML.match(/transition:[^;}]*/g) ?? [];
    expect(transitions).toHaveLength(2);
    expect(transitions[0]).toMatch(/^transition:opacity /);
    expect(transitions[1]).toBe('transition:none');
  });

  it('turns the animation off for reduced motion', () => {
    expect(DIM_PAGE_HTML).toContain('prefers-reduced-motion:reduce');
  });

  it('is a gray with partial transparency', () => {
    const match = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(DIM_COLOR);
    expect(match).not.toBeNull();
    const [, r, g, b, a] = match ?? [];
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(Number(a)).toBeGreaterThan(0);
    expect(Number(a)).toBeLessThan(1);
    expect(DIM_PAGE_HTML).toContain(DIM_COLOR);
  });

  it('the URL carries the page', () => {
    const prefix = 'data:text/html;charset=utf-8,';
    expect(DIM_PAGE_URL.startsWith(prefix)).toBe(true);
    expect(decodeURIComponent(DIM_PAGE_URL.slice(prefix.length))).toBe(
      DIM_PAGE_HTML,
    );
  });
});
