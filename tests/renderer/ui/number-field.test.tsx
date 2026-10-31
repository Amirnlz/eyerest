// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberField, digitsOnly, numberFieldClassName } from '../../../src/renderer/ui';

describe('numberFieldClassName', () => {
  it('adds the invalid modifier only for an invalid field', () => {
    expect(numberFieldClassName(false)).toBe('er-number-field');
    expect(numberFieldClassName(true)).toBe('er-number-field er-number-field--invalid');
  });
});

describe('digitsOnly', () => {
  it.each([
    ['123', '123'],
    ['', ''],
    ['a1b2c3', '123'],
    ['1.5', '15'],
    ['-5', '5'],
    ['+5', '5'],
    ['1e3', '13'],
    [' 4 2 ', '42'],
    ['०१२', ''],
  ])('keeps only the digits of %j', (input, expected) => {
    expect(digitsOnly(input)).toBe(expected);
  });
});

describe('NumberField', () => {
  it('renders a text box named by its label, not a spinbutton', () => {
    render(<NumberField label="Work interval" value="20" onValueChange={() => undefined} />);
    const input = screen.getByRole('textbox', { name: 'Work interval' });
    expect(input).toHaveValue('20');
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('has no spin buttons: a text input with a numeric keyboard hint', () => {
    render(<NumberField label="Work interval" value="20" onValueChange={() => undefined} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
  });

  function Harness({ maxLength }: { readonly maxLength?: number }) {
    const [value, setValue] = useState('');
    return (
      <NumberField
        label="Work interval"
        value={value}
        onValueChange={setValue}
        maxLength={maxLength}
      />
    );
  }

  it('reports the digits typed, one change per keystroke', async () => {
    const onValueChange = vi.fn();
    function Spy() {
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
    render(<Spy />);

    await userEvent.type(screen.getByRole('textbox'), '25');

    expect(onValueChange.mock.calls).toEqual([['2'], ['25']]);
  });

  it('drops letters, signs, dots and exponents as they are typed', async () => {
    render(<Harness />);
    const input = screen.getByRole('textbox');

    await userEvent.type(input, 'a1-b.2e+3');

    expect(input).toHaveValue('123');
  });

  it('keeps only the digits of pasted text', async () => {
    render(<Harness />);
    const input = screen.getByRole('textbox');

    await userEvent.click(input);
    await userEvent.paste('4a5.6');

    expect(input).toHaveValue('456');
  });

  it('never reports a non-digit to the owner', async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="A" value="" onValueChange={onValueChange} />);

    await userEvent.type(screen.getByRole('textbox'), 'x-1.5e');

    for (const [value] of onValueChange.mock.calls) expect(value).toMatch(/^\d*$/);
  });

  it('stops at maxLength', async () => {
    render(<Harness maxLength={2} />);
    const input = screen.getByRole('textbox');

    await userEvent.type(input, '12345');

    expect(input).toHaveValue('12');
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
    const input = screen.getByRole('textbox', { name: 'Eye rest' });
    expect(input).toHaveAccessibleDescription('seconds The length of a regular rest.');
  });

  it('has no description and is valid when there is no unit, hint or error', () => {
    render(<NumberField label="Eye rest" value="20" onValueChange={() => undefined} />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
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
    const input = screen.getByRole('textbox', { name: 'Heads-up' });
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
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('seconds Extra help');
  });

  it('gives every field its own ids', () => {
    render(
      <>
        <NumberField label="A" value="1" onValueChange={() => undefined} unit="x" />
        <NumberField label="B" value="2" onValueChange={() => undefined} unit="x" />
      </>,
    );
    const [a, b] = screen.getAllByRole('textbox');
    expect(a?.id).not.toBe(b?.id);
    expect(a).toHaveAccessibleName('A');
    expect(b).toHaveAccessibleName('B');
  });

  it('does not fire and is exposed as disabled when disabled', async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="Eye rest" value="20" onValueChange={onValueChange} disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    await userEvent.type(input, '5');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('is skipped by Tab when disabled and reachable by Tab otherwise', async () => {
    const { rerender } = render(
      <NumberField label="Eye rest" value="20" onValueChange={() => undefined} />,
    );
    await userEvent.tab();
    expect(screen.getByRole('textbox')).toHaveFocus();

    rerender(<NumberField label="Eye rest" value="20" onValueChange={() => undefined} disabled />);
    await userEvent.tab();
    expect(screen.getByRole('textbox')).not.toHaveFocus();
  });

  it('can be focused by clicking its label', async () => {
    render(<NumberField label="Eye rest" value="20" onValueChange={() => undefined} />);
    await userEvent.click(screen.getByText('Eye rest'));
    expect(screen.getByRole('textbox')).toHaveFocus();
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
        maxLength={3}
        readOnly
      />,
    );
    const input = screen.getByTestId('field');
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('maxlength', '3');
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
