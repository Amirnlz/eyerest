// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Countdown,
  ProgressRing,
  RING_RADIUS,
  clampPercent,
  percentRemaining,
  ringClassName,
  ringGeometry,
} from '../../../src/renderer/ui';

const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

describe('clampPercent', () => {
  it.each([
    [-5, 0],
    [0, 0],
    [42.5, 42.5],
    [100, 100],
    [150, 100],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [Number.NEGATIVE_INFINITY, 0],
  ])('clamps %s to %s', (input, expected) => {
    expect(clampPercent(input)).toBe(expected);
  });
});

describe('percentRemaining', () => {
  it.each([
    [20, 20, 100],
    [10, 20, 50],
    [0, 20, 0],
    [25, 20, 100],
    [-1, 20, 0],
    [5, 0, 0],
    [5, -10, 0],
    [5, Number.NaN, 0],
  ])('%s of %s seconds left is %s percent', (left, total, expected) => {
    expect(percentRemaining(left, total)).toBe(expected);
  });
});

describe('ringGeometry', () => {
  it('draws the full ring at 100 percent', () => {
    const g = ringGeometry(100);
    expect(g.dashOffset).toBe(0);
    expect(g.circumference).toBeCloseTo(CIRCUMFERENCE, 10);
  });

  it('draws nothing at 0 percent', () => {
    const g = ringGeometry(0);
    expect(g.dashOffset).toBeCloseTo(CIRCUMFERENCE, 10);
  });

  it('draws half the ring at 50 percent', () => {
    expect(ringGeometry(50).dashOffset).toBeCloseTo(CIRCUMFERENCE / 2, 10);
  });

  it('clamps out-of-range input to 0..100 percent', () => {
    expect(ringGeometry(-20)).toEqual(ringGeometry(0));
    expect(ringGeometry(250)).toEqual(ringGeometry(100));
    expect(ringGeometry(Number.NaN)).toEqual(ringGeometry(0));
  });

  it('shrinks the arc as the percentage falls', () => {
    expect(ringGeometry(30).dashOffset).toBeGreaterThan(
      ringGeometry(60).dashOffset,
    );
  });
});

describe('ringClassName', () => {
  it.each(['sm', 'md', 'lg'] as const)('maps %s', (size) => {
    expect(ringClassName(size)).toBe(`er-ring er-ring--${size}`);
  });
});

describe('ProgressRing', () => {
  it('is decorative by default: the drawing is hidden from assistive tech', () => {
    const { container } = render(<ProgressRing percent={50} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('exposes a labelled progressbar with value, min and max', () => {
    render(<ProgressRing percent={37.6} label="Rest progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Rest progress' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '38');
  });

  it.each([
    [-10, '0'],
    [180, '100'],
    [Number.NaN, '0'],
  ])('reports %s percent as aria-valuenow %s', (percent, now) => {
    render(<ProgressRing percent={percent} label="Progress" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      now,
    );
  });

  it('sets the dash pattern from the percentage', () => {
    const { container } = render(<ProgressRing percent={25} />);
    const arc = container.querySelector<SVGCircleElement>('.er-ring__progress');
    expect(Number(arc?.style.strokeDasharray)).toBeCloseTo(CIRCUMFERENCE, 6);
    expect(Number(arc?.style.strokeDashoffset)).toBeCloseTo(
      CIRCUMFERENCE * 0.75,
      6,
    );
  });

  it('updates the arc when the percentage changes', () => {
    const { container, rerender } = render(<ProgressRing percent={100} />);
    const offsetOf = () =>
      Number(
        container.querySelector<SVGCircleElement>('.er-ring__progress')?.style
          .strokeDashoffset,
      );
    expect(offsetOf()).toBe(0);
    rerender(<ProgressRing percent={0} />);
    expect(offsetOf()).toBeCloseTo(CIRCUMFERENCE, 6);
  });

  it('draws a track and an arc with the same radius', () => {
    const { container } = render(<ProgressRing percent={50} />);
    const track = container.querySelector('.er-ring__track');
    const arc = container.querySelector('.er-ring__progress');
    expect(track?.getAttribute('r')).toBe(String(RING_RADIUS));
    expect(arc?.getAttribute('r')).toBe(String(RING_RADIUS));
  });

  it('defaults to md and applies the requested size', () => {
    const { container, rerender } = render(<ProgressRing percent={5} />);
    expect(container.firstElementChild).toHaveClass('er-ring--md');
    rerender(<ProgressRing percent={5} size="lg" />);
    expect(container.firstElementChild).toHaveClass('er-ring--lg');
  });

  it('keeps children readable when the ring is labelled', () => {
    render(
      <ProgressRing percent={50} label="Rest progress">
        <Countdown seconds={10} />
      </ProgressRing>,
    );
    expect(screen.getByRole('timer')).toHaveTextContent('10');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders no content wrapper without children', () => {
    const { container } = render(<ProgressRing percent={50} />);
    expect(container.querySelector('.er-ring__content')).toBeNull();
  });
});

describe('ProgressRing.css contract', () => {
  const css = readFileSync(
    join(__dirname, '../../../src/renderer/ui/ProgressRing.css'),
    'utf8',
  );

  it('sweeps one tick, linearly, only on the dash offset', () => {
    expect(css).toContain('transition-property: stroke-dashoffset;');
    expect(css).toContain('transition-duration: var(--er-duration-tick);');
    expect(css).toContain('transition-timing-function: var(--er-ease-linear);');
  });

  it('drops the sweep under reduced motion', () => {
    const reduced =
      /prefers-reduced-motion:\s*reduce\)\s*\{\s*\.er-ring__progress\s*\{([^}]*)\}/.exec(
        css,
      );
    expect(reduced?.[1]).toContain('transition-property: none;');
  });

  it('uses the accent color for the arc and the inset color for the track', () => {
    expect(css).toMatch(
      /\.er-ring__progress\s*\{[^}]*stroke:\s*var\(--er-color-accent\);/,
    );
    expect(css).toMatch(
      /\.er-ring__track\s*\{[^}]*stroke:\s*var\(--er-color-surface-inset\);/,
    );
  });

  it('starts the arc at the top with round caps', () => {
    expect(css).toMatch(
      /\.er-ring__svg\s*\{[^}]*transform:\s*rotate\(-90deg\);/,
    );
    expect(css).toMatch(
      /\.er-ring__progress\s*\{[^}]*stroke-linecap:\s*round;/,
    );
  });

  it.each(['sm', 'md', 'lg'])(
    'the %s size is a multiple of a space token',
    (size) => {
      expect(css).toMatch(
        new RegExp(
          `\\.er-ring--${size}\\s*\\{[^}]*inline-size:\\s*calc\\(var\\(--er-space-12\\) \\* \\d\\);`,
        ),
      );
    },
  );

  it('names system colors for forced-colors mode', () => {
    expect(css).toMatch(/forced-colors:\s*active\)[\s\S]*GrayText/);
    expect(css).toMatch(/forced-colors:\s*active\)[\s\S]*Highlight/);
  });
});
