// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Button,
  Icon,
  iconClassName,
  iconNames,
  icons,
  strokeWidths,
} from '../../../src/renderer/ui';

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('no svg rendered');
  return svg;
}

describe('iconClassName', () => {
  it('maps size, and adds the mirror class only for direction-bound icons', () => {
    expect(iconClassName('eye', 'md')).toBe('er-icon er-icon--md');
    expect(iconClassName('skip', 'sm')).toBe(
      'er-icon er-icon--sm er-icon--mirror',
    );
  });
});

describe('Icon', () => {
  it.each(iconNames)('%s renders one svg on the 24 grid', (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg.querySelectorAll('path, circle').length).toBe(
      icons[name].shapes.length,
    );
  });

  it('paints with currentColor only: no hard-coded color anywhere', () => {
    const { container } = render(<Icon name="eye" variant="fill" />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}|rgb|hsl/);
  });

  it('is decorative and hidden from assistive tech by default', () => {
    const { container } = render(<Icon name="sun" />);
    expect(svgOf(container)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('exposes an image with a name when labelled', () => {
    render(<Icon name="sun" label="Light theme" />);
    expect(
      screen.getByRole('img', { name: 'Light theme' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['regular', '1.5'],
    ['medium', '2'],
    ['bold', '2.5'],
  ] as const)('weight %s draws a %spx stroke', (weight, width) => {
    const { container } = render(<Icon name="eye" weight={weight} />);
    expect(svgOf(container)).toHaveAttribute('stroke-width', width);
  });

  it('defaults to the medium stroke (semibold labels)', () => {
    const { container } = render(<Icon name="eye" />);
    expect(svgOf(container)).toHaveAttribute(
      'stroke-width',
      String(strokeWidths.medium),
    );
  });

  it('outline leaves every shape unfilled', () => {
    const { container } = render(<Icon name="eye" />);
    for (const shape of container.querySelectorAll('path, circle')) {
      expect(shape).toHaveAttribute('fill', 'none');
    }
  });

  it('fill colors only the fillable shapes', () => {
    const { container } = render(<Icon name="eye" variant="fill" />);
    const fills = [...container.querySelectorAll('path, circle')].map((s) =>
      s.getAttribute('fill'),
    );
    expect(fills).toEqual(['none', 'currentColor']);
  });

  it('fill changes nothing for an icon with no fillable shape', () => {
    const outline = render(<Icon name="postpone" />).container.innerHTML;
    const filled = render(<Icon name="postpone" variant="fill" />).container
      .innerHTML;
    expect(filled).toBe(outline);
  });

  it.each(['sm', 'md', 'lg'] as const)('applies the %s size class', (size) => {
    const { container } = render(<Icon name="moon" size={size} />);
    expect(svgOf(container)).toHaveClass(`er-icon--${size}`);
  });

  it('marks only the skip icon for RTL mirroring', () => {
    const skip = render(<Icon name="skip" />).container;
    const eye = render(<Icon name="eye" />).container;
    expect(svgOf(skip)).toHaveClass('er-icon--mirror');
    expect(svgOf(eye)).not.toHaveClass('er-icon--mirror');
  });

  it('names an icon-only button through the button, not the icon', () => {
    render(
      <Button aria-label="Skip this rest">
        <Icon name="skip" />
      </Button>,
    );
    expect(
      screen.getByRole('button', { name: 'Skip this rest' }),
    ).toBeInTheDocument();
  });

  it('adds no accessible text next to a visible label when decorative', () => {
    render(
      <Button>
        <Icon name="postpone" />
        Postpone
      </Button>,
    );
    expect(
      screen.getByRole('button', { name: 'Postpone' }),
    ).toBeInTheDocument();
  });
});

describe('Icon.css contract', () => {
  const css = readFileSync(
    join(__dirname, '../../../src/renderer/ui/Icon.css'),
    'utf8',
  );

  it('keeps stroke widths in screen pixels', () => {
    expect(css).toMatch(
      /\.er-icon :is\(path, circle\)\s*\{[^}]*vector-effect:\s*non-scaling-stroke;/,
    );
  });

  it('sizes inline icons at 1em and 1.25em', () => {
    expect(css).toMatch(/\.er-icon--sm\s*\{[^}]*inline-size:\s*1em;/);
    expect(css).toMatch(/\.er-icon--md\s*\{[^}]*inline-size:\s*1.25em;/);
  });

  it('mirrors in RTL with exactly one mechanism', () => {
    expect(css).toMatch(
      /\[dir='rtl'\] \.er-icon--mirror\s*\{[^}]*scale:\s*-1 1;/,
    );
    expect(css.match(/scale:/g)).toHaveLength(1);
  });

  it('takes its color from the parent', () => {
    expect(css).toMatch(/\.er-icon\s*\{[^}]*color:\s*inherit;/);
  });
});
