// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, buttonClassName } from '../../../src/renderer/ui';
import type { ButtonSize, ButtonVariant } from '../../../src/renderer/ui';

const variants: readonly ButtonVariant[] = ['primary', 'secondary', 'quiet'];
const sizes: readonly ButtonSize[] = ['sm', 'md'];

describe('buttonClassName', () => {
  it.each(variants.flatMap((v) => sizes.map((s) => [v, s] as const)))(
    '%s %s maps to base, variant and size classes',
    (variant, size) => {
      expect(buttonClassName(variant, size, false)).toBe(
        `er-button er-button--${variant} er-button--${size}`,
      );
    },
  );

  it('adds an icon-side class only when an icon position is given', () => {
    expect(buttonClassName('primary', 'md', false)).not.toContain('icon');
    expect(buttonClassName('primary', 'md', false, 'start')).toContain('er-button--icon-start');
    expect(buttonClassName('primary', 'md', false, 'end')).toContain('er-button--icon-end');
  });

  it('adds the static class only when opted out', () => {
    expect(buttonClassName('primary', 'md', true)).toContain('er-button--static');
    expect(buttonClassName('primary', 'md', false)).not.toContain('er-button--static');
  });
});

describe('Button', () => {
  it('renders a native button with an accessible name', () => {
    render(<Button>Skip</Button>);
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('defaults to secondary, md, type="button"', () => {
    render(<Button>Skip</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('er-button--secondary', 'er-button--md');
    expect(button).toHaveAttribute('type', 'button');
  });

  it.each(variants)('applies the %s variant class', (variant) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole('button')).toHaveClass(`er-button--${variant}`);
  });

  it.each(sizes)('applies the %s size class', (size) => {
    render(<Button size={size}>Go</Button>);
    expect(screen.getByRole('button')).toHaveClass(`er-button--${size}`);
  });

  it('honors an explicit type', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('calls onClick once per click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Skip</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled and is exposed as disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Skip</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is reachable by Tab and operable with Enter and Space', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Skip</Button>);
    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('is skipped by Tab when disabled', async () => {
    render(<Button disabled>Skip</Button>);
    await userEvent.tab();
    expect(screen.getByRole('button')).not.toHaveFocus();
  });

  it('passes through aria attributes and forwards the ref', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref} aria-label="Skip this rest" aria-describedby="hint">Skip</Button>);
    const button = screen.getByRole('button', { name: 'Skip this rest' });
    expect(button).toHaveAttribute('aria-describedby', 'hint');
    expect(ref.current).toBe(button);
  });

  it('marks static buttons with the opt-out class', () => {
    render(<Button static>Skip</Button>);
    expect(screen.getByRole('button')).toHaveClass('er-button--static');
  });
});

describe('Button icon', () => {
  it('renders no icon and no icon class by default', () => {
    render(<Button>Skip</Button>);
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeNull();
    expect(button.className).not.toContain('icon');
  });

  it('puts the icon before the label by default, hidden from assistive tech', () => {
    render(<Button icon="skip">Skip</Button>);
    const button = screen.getByRole('button', { name: 'Skip' });
    expect(button).toHaveClass('er-button--icon-start');
    expect(button.firstElementChild?.tagName.toLowerCase()).toBe('svg');
    expect(button.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(button.lastChild?.textContent).toBe('Skip');
  });

  it('puts the icon after the label with iconPosition="end"', () => {
    render(<Button icon="postpone" iconPosition="end">Postpone</Button>);
    const button = screen.getByRole('button', { name: 'Postpone' });
    expect(button).toHaveClass('er-button--icon-end');
    expect(button.lastElementChild?.tagName.toLowerCase()).toBe('svg');
    expect(button.firstChild?.textContent).toBe('Postpone');
  });

  it('renders exactly one icon', () => {
    render(<Button icon="eye" iconPosition="end">Look away</Button>);
    expect(screen.getByRole('button').querySelectorAll('svg')).toHaveLength(1);
  });

  it('stays operable by keyboard with an icon', async () => {
    const onClick = vi.fn();
    render(<Button icon="skip" onClick={onClick}>Skip</Button>);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Button.css contract (better-ui)', () => {
  const css = readFileSync(join(__dirname, '../../../src/renderer/ui/Button.css'), 'utf8');

  it('scales on press via the motion token, never on disabled, with a static opt-out', () => {
    const selector = '\\.er-button:not\\(\\.er-button--static\\):not\\(:disabled\\):active';
    const rule = `${selector}\\s*\\{\\s*scale:\\s*var\\(--er-motion-press-scale\\);`;
    expect(css).toMatch(new RegExp(rule));
  });

  it('transitions only named properties, with the quick duration and ease-out', () => {
    expect(css).toContain('transition-property: scale, box-shadow, background-color;');
    expect(css).toContain('transition-duration: var(--er-duration-quick);');
    expect(css).toContain('transition-timing-function: var(--er-ease-out);');
  });

  it('drops scale from the transition under reduced motion', () => {
    const reduced = /prefers-reduced-motion:\s*reduce\)\s*\{\s*\.er-button\s*\{([^}]*)\}/.exec(css);
    expect(reduced?.[1]).toContain('transition-property: box-shadow, background-color;');
  });

  it('draws a visible focus ring only for keyboard focus', () => {
    expect(css).toMatch(/\.er-button:focus-visible\s*\{[^}]*outline:\s*var\(--er-stroke-focus\)/);
    expect(css).not.toMatch(/outline:\s*none/);
  });

  it('keeps a transparent border so forced-colors mode still draws an edge', () => {
    expect(css).toContain('border: var(--er-stroke-hairline) solid transparent;');
    expect(css).toMatch(/forced-colors:\s*active\)[\s\S]*border-color:\s*ButtonText/);
  });

  it('suppresses the mobile tap highlight', () => {
    expect(css).toContain('-webkit-tap-highlight-color: transparent;');
  });

  it('sets disabled state from the opacity token and a not-allowed cursor', () => {
    expect(css).toMatch(/\.er-button:disabled\s*\{[^}]*opacity:\s*var\(--er-opacity-disabled\)/);
    expect(css).toMatch(/\.er-button:disabled\s*\{[^}]*cursor:\s*not-allowed/);
  });

  it('is concentric inside a tight Surface and falls back to the md radius elsewhere', () => {
    expect(css).toContain(
      'border-radius: var(--er-surface-inner-radius, var(--er-radius-md));',
    );
  });

  it('gives the icon side 2px less padding through the optical token, on logical sides', () => {
    expect(css).toMatch(
      /\.er-button--icon-start\s*\{\s*padding-inline-start:\s*calc\(var\(--er-button-pad-inline\) - var\(--er-optical-nudge\)\);/,
    );
    expect(css).toMatch(
      /\.er-button--icon-end\s*\{\s*padding-inline-end:\s*calc\(var\(--er-button-pad-inline\) - var\(--er-optical-nudge\)\);/,
    );
    expect(css).not.toMatch(/padding-(left|right)/);
  });

  it('declares each size padding once as a component variable the icon rules subtract from', () => {
    expect(css).toMatch(/\.er-button--sm\s*\{[^}]*--er-button-pad-inline:\s*var\(--er-space-4\);/);
    expect(css).toMatch(/\.er-button--md\s*\{[^}]*--er-button-pad-inline:\s*var\(--er-space-6\);/);
  });

  it('declares the icon rules after the size rules so the nudge wins at equal specificity', () => {
    expect(css.indexOf('.er-button--icon-start {')).toBeGreaterThan(css.indexOf('.er-button--md {'));
  });
});
