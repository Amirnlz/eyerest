// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Countdown } from '../../../src/renderer/ui';

describe('Countdown', () => {
  it('is a timer showing whole seconds under a minute', () => {
    render(<Countdown seconds={18} />);
    expect(screen.getByRole('timer')).toHaveTextContent('18');
  });

  it.each([
    [60, '1:00'],
    [599, '9:59'],
    [600, '10:00'],
    [0, '0'],
    [-3, '0'],
    [Number.NaN, '0'],
  ])('formats %s as %s', (seconds, text) => {
    render(<Countdown seconds={seconds} />);
    expect(screen.getByRole('timer')).toHaveTextContent(
      new RegExp(`^${text}$`),
    );
  });

  it('updates when the seconds change', () => {
    const { rerender } = render(<Countdown seconds={5} />);
    rerender(<Countdown seconds={4} />);
    expect(screen.getByRole('timer')).toHaveTextContent('4');
  });

  it('renders the digits in the display type role', () => {
    render(<Countdown seconds={5} />);
    const digits = screen.getByText('5');
    expect(digits).toHaveClass('er-text', 'er-text--display');
  });

  it('applies the secondary tone', () => {
    render(<Countdown seconds={5} tone="secondary" />);
    expect(screen.getByText('5')).toHaveClass('er-text--secondary');
  });

  it('can be named, and keeps passed attributes', () => {
    render(<Countdown seconds={5} aria-label="Time left" data-testid="c" />);
    expect(screen.getByRole('timer', { name: 'Time left' })).toBe(
      screen.getByTestId('c'),
    );
  });

  it('is not a live region, so screen readers are not told every second', () => {
    render(<Countdown seconds={5} />);
    const el = screen.getByRole('timer');
    expect(el).not.toHaveAttribute('aria-live', 'polite');
    expect(el).not.toHaveAttribute('aria-live', 'assertive');
  });

  it('cannot have its role overridden', () => {
    render(<Countdown seconds={5} />);
    expect(screen.getByRole('timer').getAttribute('role')).toBe('timer');
  });
});

describe('Countdown.css contract', () => {
  const css = readFileSync(
    join(__dirname, '../../../src/renderer/ui/Countdown.css'),
    'utf8',
  );

  it('does not wrap and stays centered', () => {
    expect(css).toMatch(/\.er-countdown\s*\{[^}]*white-space:\s*nowrap;/);
    expect(css).toMatch(/\.er-countdown\s*\{[^}]*text-align:\s*center;/);
  });

  it('leaves typography to the Text display role', () => {
    expect(css).not.toMatch(/font-|line-height|letter-spacing/);
  });
});
