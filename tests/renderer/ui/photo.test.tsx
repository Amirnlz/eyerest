// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Photo, photoClassName } from '../../../src/renderer/ui';

describe('photoClassName', () => {
  it('adds the artwork class only for transparent artwork', () => {
    expect(photoClassName(false)).toBe('er-photo');
    expect(photoClassName(true)).toBe('er-photo er-photo--artwork');
  });
});

describe('Photo', () => {
  it('renders an image with its accessible name', () => {
    render(<Photo src="a.png" alt="Rest illustration" />);
    expect(screen.getByRole('img', { name: 'Rest illustration' })).toHaveClass('er-photo');
  });

  it('is decorative with an empty alt, and hidden from the accessibility tree', () => {
    render(<Photo src="a.png" alt="" />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('marks artwork so the outline is skipped', () => {
    render(<Photo src="logo.png" alt="Logo" artwork />);
    expect(screen.getByRole('img')).toHaveClass('er-photo', 'er-photo--artwork');
  });

  it('forwards the ref and native attributes', () => {
    const ref = createRef<HTMLImageElement>();
    render(<Photo ref={ref} src="a.png" alt="A" width={40} loading="lazy" />);
    const img = screen.getByRole('img');
    expect(ref.current).toBe(img);
    expect(img).toHaveAttribute('width', '40');
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});

describe('Photo.css contract (better-ui)', () => {
  const css = readFileSync(join(__dirname, '../../../src/renderer/ui/Photo.css'), 'utf8');

  it('outlines 1px in the image-outline token only, inset by 1px', () => {
    expect(css).toContain('outline: var(--er-stroke-hairline) solid var(--er-color-image-outline);');
    expect(css).toContain('outline-offset: calc(var(--er-stroke-hairline) * -1);');
  });

  it('never tints the outline: no text, border, accent or shadow token feeds it', () => {
    const outlines = css.match(/outline[^;]*;/g) ?? [];
    for (const line of outlines) {
      expect(line).not.toMatch(/text-|border-|accent|shadow|focus/);
    }
  });

  it('skips the outline for artwork', () => {
    expect(css).toMatch(/\.er-photo--artwork\s*\{\s*outline-style:\s*none;/);
  });
});
