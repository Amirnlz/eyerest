// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisuallyHidden } from '../../../src/renderer/ui';

describe('VisuallyHidden', () => {
  it('keeps its text in the accessibility tree', () => {
    render(<VisuallyHidden>Screen reader text</VisuallyHidden>);
    expect(screen.getByText('Screen reader text')).toHaveClass('er-visually-hidden');
    expect(screen.getByText('Screen reader text')).not.toHaveAttribute('hidden');
    expect(screen.getByText('Screen reader text')).not.toHaveAttribute('aria-hidden');
  });

  it('passes role and aria attributes through', () => {
    render(<VisuallyHidden role="status" aria-atomic="true">Done</VisuallyHidden>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
  });
});

describe('VisuallyHidden.css contract', () => {
  const css = readFileSync(
    join(__dirname, '../../../src/renderer/ui/VisuallyHidden.css'),
    'utf8',
  );

  it('clips the box instead of removing it from rendering', () => {
    expect(css).toContain('clip-path: inset(50%);');
    expect(css).toContain('overflow: hidden;');
    expect(css).toContain('position: absolute;');
    expect(css).not.toMatch(/display:\s*none/);
    expect(css).not.toMatch(/visibility:\s*hidden/);
  });

  it('sizes the box with the hairline token and never zero, which some readers skip', () => {
    expect(css).toContain('inline-size: var(--er-stroke-hairline);');
    expect(css).toContain('block-size: var(--er-stroke-hairline);');
  });
});
