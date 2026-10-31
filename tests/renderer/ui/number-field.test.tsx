// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberField, numberFieldClassName } from '../../../src/renderer/ui';

describe('numberFieldClassName', () => {
  it('adds the invalid modifier only for an invalid field', () => {
    expect(numberFieldClassName(false)).toBe('er-number-field');
    expect(numberFieldClassName(true)).toBe('er-number-field er-number-field--invalid');
  });
});

describe('NumberField', () => {
  it('renders a spinbutton named by its label', () => {
    render(<NumberField label="Work interval" value="20" onValueChange={() => undefined} />);
    const input = screen.getByRole('spinbutton', { name: 'Work interval' });
    expect(input).toHaveValue(20);
    expect(input).toHaveAttribute('type', 'number');
  });

  it('reports each change as the raw string', async () => {
    const onValueChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <NumberField
          label="Work interval"
          value={value}
          onValueChange={(next) => {
            onValueChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Harness />);

    await userEvent.type(screen.getByRole('spinbutton'), '25');

    expect(onValueChange.mock.calls).toEqual([['2'], ['25']]);
  });

  it('reads the unit and the hint as the description', () => {
    render(
      <NumberField
        label="Eye rest"
        value="20"
        onValueChange={() => undefined}
        unit="seconds"
        hint="The length of a regular rest."
      />,
    );
    const input = screen.getByRole('spinbutton', { name: 'Eye rest' });
    expect(input).toHaveAccessibleDescription('seconds The length of a regular rest.');
  });

  it('has no description and is valid when there is no unit, hint or error', () => {
    render(<NumberField label="Eye rest" value="20" onValueChange={() => undefined} />);
    const input = screen.getByRole('spinbutton');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toBeValid();
  });

  it('marks an error: invalid, described by the message, with the invalid class', () => {
    const { container } = render(
      <NumberField
        label="Heads-up"
        value="0"
        onValueChange={() => undefined}
        unit="seconds"
        error="Must be greater than 0."
      />,
    );
    const input = screen.getByRole('spinbutton', { name: 'Heads-up' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('seconds Must be greater than 0.');
    expect(container.firstElementChild).toHaveClass('er-number-field--invalid');
    expect(screen.getByText('Must be greater than 0.')).toBeInTheDocument();
  });

  it('keeps the caller description after its own parts', () => {
    render(
      <>
        <p id="extra">Extra help</p>
        <NumberField
          label="Eye rest"
          value="20"
          onValueChange={() => undefined}
          unit="seconds"
          aria-describedby="extra"
        />
      </>,
    );
    expect(screen.getByRole('spinbutton')).toHaveAccessibleDescription('seconds Extra help');
  });

  it('gives every field its own ids', () => {
    render(
      <>
        <NumberField label="A" value="1" onValueChange={() => undefined} unit="x" />
        <NumberField label="B" value="2" onValueChange={() => undefined} unit="x" />
      </>,
    );
    const [a, b] = screen.getAllByRole('spinbutton');
    expect(a?.id).not.toBe(b?.id);
    expect(a).toHaveAccessibleName('A');
    expect(b).toHaveAccessibleName('B');
  });

  it('does not fire and is exposed as disabled when disabled', async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="Eye rest" value="20" onValueChange={onValueChange} disabled />);
    const input = screen.getByRole('spinbutton');
    expect(input).toBeDisabled();
    await userEvent.type(input, '5');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('is skipped by Tab when disabled and reachable by Tab otherwise', async () => {
    const { rerender } = render(
      <NumberField label="Eye rest" value="20" onValueChange={() => undefined} />,
    );
    await userEvent.tab();
    expect(screen.getByRole('spinbutton')).toHaveFocus();

    rerender(<NumberField label="Eye rest" value="20" onValueChange={() => undefined} disabled />);
    await userEvent.tab();
    expect(screen.getByRole('spinbutton')).not.toHaveFocus();
  });

  it('can be focused by clicking its label', async () => {
    render(<NumberField label="Eye rest" value="20" onValueChange={() => undefined} />);
    await userEvent.click(screen.getByText('Eye rest'));
    expect(screen.getByRole('spinbutton')).toHaveFocus();
  });

  it('passes through data and input attributes and forwards the ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <NumberField
        ref={ref}
        label="Eye rest"
        value="20"
        onValueChange={() => undefined}
        data-testid="field"
        min={0}
        step="any"
        readOnly
      />,
    );
    const input = screen.getByTestId('field');
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('step', 'any');
    expect(input).toHaveAttribute('readonly');
  });
});

describe('NumberField.css contract', () => {
  const css = readFileSync(join(__dirname, '../../../src/renderer/ui/NumberField.css'), 'utf8');

  it('draws a visible focus ring only for keyboard focus', () => {
    expect(css).toMatch(
      /\.er-number-field__input:focus-visible\s*\{[^}]*outline:\s*var\(--er-stroke-focus\) solid var\(--er-color-focus-ring\)/,
    );
    expect(css).not.toMatch(/outline:\s*none/);
  });

  it('transitions only named properties with the quick duration', () => {
    expect(css).toContain('transition-property: border-color, box-shadow;');
    expect(css).toContain('transition-duration: var(--er-duration-quick);');
  });

  it('sets disabled state from the opacity token and a not-allowed cursor', () => {
    expect(css).toMatch(/__input:disabled\s*\{[^}]*opacity:\s*var\(--er-opacity-disabled\)/);
    expect(css).toMatch(/__input:disabled\s*\{[^}]*cursor:\s*not-allowed/);
  });

  it('keeps a visible edge in forced-colors mode, also when disabled', () => {
    expect(css).toMatch(/forced-colors:\s*active\)[\s\S]*border-color:\s*FieldText/);
    expect(css).toMatch(/forced-colors:\s*active\)[\s\S]*:disabled\s*\{\s*border-color:\s*GrayText/);
  });

  it('marks an invalid field with a stronger edge, not a hue', () => {
    expect(css).toMatch(
      /\.er-number-field--invalid \.er-number-field__input\s*\{\s*border-color:\s*var\(--er-color-text-primary\)/,
    );
  });

  it('guards hover behind (hover: hover) and never hovers a disabled field', () => {
    expect(css).toMatch(/@media \(hover: hover\)\s*\{\s*\.er-number-field__input:not\(:disabled\):hover/);
  });
});
