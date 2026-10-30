// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { elevationNames } from '../../../src/design/elevation';
import { Surface, surfaceClassName } from '../../../src/renderer/ui';
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
} from '../../../src/renderer/ui';

const elevations: readonly SurfaceElevation[] = ['flat', ...elevationNames];
const paddings: readonly SurfacePadding[] = ['none', 'xs', 'sm', 'md', 'lg'];
const radii: readonly SurfaceRadius[] = ['sm', 'md', 'lg'];

describe('surfaceClassName', () => {
  it('maps every option to its class', () => {
    expect(surfaceClassName('inset-sm', 'none', 'md')).toBe(
      'er-surface er-surface--inset-sm er-surface--pad-none er-surface--radius-md',
    );
  });
});

describe('Surface', () => {
  it('renders children in a div with raised-md, md padding, lg radius by default', () => {
    render(<Surface data-testid="s">content</Surface>);
    const el = screen.getByTestId('s');
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveTextContent('content');
    expect(el).toHaveClass(
      'er-surface',
      'er-surface--raised-md',
      'er-surface--pad-md',
      'er-surface--radius-lg',
    );
  });

  it.each(elevations)('applies the %s elevation class', (elevation) => {
    render(
      <Surface data-testid="s" elevation={elevation}>
        x
      </Surface>,
    );
    expect(screen.getByTestId('s')).toHaveClass(`er-surface--${elevation}`);
  });

  it.each(paddings)('applies the %s padding class', (padding) => {
    render(
      <Surface data-testid="s" padding={padding}>
        x
      </Surface>,
    );
    expect(screen.getByTestId('s')).toHaveClass(`er-surface--pad-${padding}`);
  });

  it.each(radii)('applies the %s radius class', (radius) => {
    render(
      <Surface data-testid="s" radius={radius}>
        x
      </Surface>,
    );
    expect(screen.getByTestId('s')).toHaveClass(`er-surface--radius-${radius}`);
  });

  it('renders a labelled section as a region landmark', () => {
    render(
      <Surface as="section" aria-label="Rest panel">
        x
      </Surface>,
    );
    expect(
      screen.getByRole('region', { name: 'Rest panel' }),
    ).toBeInTheDocument();
  });

  it('renders the requested element', () => {
    render(
      <Surface as="aside" data-testid="s">
        x
      </Surface>,
    );
    expect(screen.getByTestId('s').tagName).toBe('ASIDE');
  });

  it('passes through aria and data attributes', () => {
    render(
      <Surface data-testid="s" aria-describedby="hint" id="panel">
        x
      </Surface>,
    );
    const el = screen.getByTestId('s');
    expect(el).toHaveAttribute('aria-describedby', 'hint');
    expect(el).toHaveAttribute('id', 'panel');
  });
});

describe('Surface.css contract', () => {
  const css = readFileSync(
    join(__dirname, '../../../src/renderer/ui/Surface.css'),
    'utf8',
  );

  it.each(elevations)('the %s class uses its elevation token', (elevation) => {
    const rule = new RegExp(
      `\\.er-surface--${elevation}\\s*\\{[^}]*box-shadow:\\s*var\\(--er-elevation-${elevation}\\);`,
    );
    expect(css).toMatch(rule);
  });

  it.each(['inset-sm', 'inset-md'])(
    '%s sinks into the canvas with the inset color',
    (elevation) => {
      const rule = new RegExp(
        `\\.er-surface--${elevation}\\s*\\{[^}]*background-color:\\s*var\\(--er-color-surface-inset\\);`,
      );
      expect(css).toMatch(rule);
    },
  );

  it.each(paddings.filter((p) => p !== 'none'))(
    'the %s padding class uses a space token',
    (padding) => {
      const rule = new RegExp(
        `\\.er-surface--pad-${padding}\\s*\\{[^}]*padding:\\s*var\\(--er-space-\\d+\\);`,
      );
      expect(css).toMatch(rule);
    },
  );

  it.each(radii)('the %s radius class uses its radius token', (radius) => {
    const rule = new RegExp(
      `\\.er-surface--radius-${radius}\\s*\\{[^}]*border-radius:\\s*var\\(--er-radius-${radius}\\);`,
    );
    expect(css).toMatch(rule);
  });

  it('keeps a transparent border and a forced-colors edge', () => {
    expect(css).toContain(
      'border: var(--er-stroke-hairline) solid transparent;',
    );
    expect(css).toMatch(
      /forced-colors:\s*active\)[\s\S]*border-color:\s*CanvasText/,
    );
  });

  it('defaults text to the primary text color on the surface color', () => {
    expect(css).toContain('color: var(--er-color-text-primary);');
    expect(css).toContain('background-color: var(--er-color-surface);');
  });

  describe('concentric radius', () => {
    it.each([
      ['xs', 2],
      ['sm', 3],
    ])(
      'pad-%s publishes outer radius - space-%i - hairline',
      (padding, step) => {
        const m = new RegExp(
          `\\.er-surface--pad-${padding}\\s*\\{([^}]*)\\}`,
        ).exec(css);
        // Whitespace does not matter to CSS, so a formatter may wrap the calc() across lines.
        const body = (m?.[1] ?? '').replace(/\s+/g, '');
        expect(body).toContain('--er-surface-inner-radius:max(');
        expect(body).toContain(
          `calc(var(--er-surface-radius)-var(--er-space-${step})-var(--er-stroke-hairline))`,
        );
      },
    );

    it.each(['none', 'md', 'lg'])(
      'pad-%s resets the inner radius',
      (padding) => {
        const m = new RegExp(
          `\\.er-surface--pad-${padding}\\s*\\{([^}]*)\\}`,
        ).exec(css);
        expect(m?.[1]).toContain('--er-surface-inner-radius: initial;');
      },
    );

    it.each(radii)('radius-%s records its radius for descendants', (radius) => {
      const m = new RegExp(
        `\\.er-surface--radius-${radius}\\s*\\{([^}]*)\\}`,
      ).exec(css);
      expect(m?.[1]).toContain(
        `--er-surface-radius: var(--er-radius-${radius});`,
      );
    });
  });
});
