// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { typeRoleNames } from '../../../src/design/typography';
import { typeProperties, typeVar } from '../../../src/design/type-css';
import { Text, defaultElement, textClassName } from '../../../src/renderer/ui';

describe('textClassName', () => {
  it('combines base, variant and tone', () => {
    expect(textClassName('display', 'secondary')).toBe(
      'er-text er-text--display er-text--secondary',
    );
  });
});

describe('Text', () => {
  it('defaults to a primary body paragraph', () => {
    render(<Text data-testid="t">Look away</Text>);
    const el = screen.getByTestId('t');
    expect(el.tagName).toBe('P');
    expect(el).toHaveClass('er-text--body', 'er-text--primary');
    expect(el).toHaveTextContent('Look away');
  });

  it.each(typeRoleNames)('renders %s with its default element', (variant) => {
    render(
      <Text data-testid="t" variant={variant}>
        x
      </Text>,
    );
    const el = screen.getByTestId('t');
    expect(el.tagName.toLowerCase()).toBe(defaultElement[variant]);
    expect(el).toHaveClass(`er-text--${variant}`);
  });

  it('uses inline elements for label and caption, blocks for the rest', () => {
    expect(defaultElement.label).toBe('span');
    expect(defaultElement.caption).toBe('span');
    expect(defaultElement.display).toBe('p');
    expect(defaultElement.title).toBe('p');
    expect(defaultElement.body).toBe('p');
  });

  it('exposes a heading when the caller chooses one', () => {
    render(
      <Text as="h2" variant="title">
        Rest your eyes
      </Text>,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Rest your eyes' }),
    ).toBeInTheDocument();
  });

  it('applies the secondary tone', () => {
    render(
      <Text data-testid="t" tone="secondary">
        x
      </Text>,
    );
    expect(screen.getByTestId('t')).toHaveClass('er-text--secondary');
  });

  it('keeps a timer role and live attributes passed by the caller', () => {
    render(
      <Text as="div" variant="display" role="timer" aria-label="Time left">
        0:18
      </Text>,
    );
    expect(screen.getByRole('timer', { name: 'Time left' })).toHaveTextContent(
      '0:18',
    );
  });
});

describe('Text.css contract', () => {
  const css = readFileSync(
    join(__dirname, '../../../src/renderer/ui/Text.css'),
    'utf8',
  );

  it.each(typeRoleNames)(
    'the %s rule reads every type token of its role',
    (role) => {
      const match = new RegExp(`\\.er-text--${role}\\s*\\{([^}]*)\\}`).exec(
        css,
      );
      expect(match).not.toBeNull();
      const body = match?.[1] ?? '';
      for (const property of typeProperties) {
        expect(body).toContain(`var(${typeVar(role, property)})`);
      }
    },
  );

  it('maps tones to the two text color tokens', () => {
    expect(css).toMatch(
      /\.er-text--primary\s*\{[^}]*color:\s*var\(--er-color-text-primary\)/,
    );
    expect(css).toMatch(
      /\.er-text--secondary\s*\{[^}]*color:\s*var\(--er-color-text-secondary\)/,
    );
  });

  it('resets the browser margin so spacing stays with the layout', () => {
    expect(css).toMatch(/\.er-text\s*\{[^}]*margin:\s*0;/);
  });
});
