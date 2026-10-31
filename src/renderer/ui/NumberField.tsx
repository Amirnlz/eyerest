import { useId, type ComponentPropsWithRef } from 'react';
import { Text } from './Text';
import './NumberField.css';

export interface NumberFieldProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'className' | 'type' | 'inputMode' | 'value' | 'onChange' | 'id' | 'children'
> {
  /** Visible label. It is the field's accessible name. */
  readonly label: string;
  /**
   * The text in the box: digits only, possibly empty. A string, not a number, so an empty box and
   * leading zeros survive until the owner parses it.
   */
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** Unit shown beside the box and read as part of the description. */
  readonly unit?: string;
  /** Help text under the box. */
  readonly hint?: string;
  /** Problem with the current value. Marks the field invalid and is read with it. */
  readonly error?: string;
}

/** Keeps the digits 0 to 9 and drops everything else. */
export function digitsOnly(text: string): string {
  return text.replace(/\D/g, '');
}

export function numberFieldClassName(invalid: boolean): string {
  return invalid ? 'er-number-field er-number-field--invalid' : 'er-number-field';
}

/**
 * Labelled box for a whole number. A native text input with a numeric keyboard hint, not
 * `type="number"`: that type draws spin buttons and accepts `e`, `+`, `-` and `.`. Anything typed or
 * pasted that is not a digit is dropped before `onValueChange` sees it. Invalid state is a message
 * and a stronger edge, never a hue (F1). Takes props and callbacks only (C8): the range belongs to
 * the owner.
 */
export function NumberField({
  label,
  value,
  onValueChange,
  unit,
  hint,
  error,
  'aria-describedby': describedByProp,
  ...props
}: NumberFieldProps) {
  const id = useId();
  const unitId = `${id}-unit`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = error !== undefined;

  const describedBy =
    [
      unit === undefined ? null : unitId,
      hint === undefined ? null : hintId,
      invalid ? errorId : null,
      describedByProp ?? null,
    ]
      .filter((part): part is string => part !== null)
      .join(' ') || undefined;

  return (
    <div className={numberFieldClassName(invalid)}>
      <label className="er-number-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="er-number-field__control">
        <input
          {...props}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          className="er-number-field__input"
          value={value}
          onChange={(event) => onValueChange(digitsOnly(event.target.value))}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
        />
        {unit === undefined ? null : (
          <Text as="span" variant="caption" tone="secondary" id={unitId}>
            {unit}
          </Text>
        )}
      </div>
      {hint === undefined ? null : (
        <Text as="p" variant="caption" tone="secondary" id={hintId}>
          {hint}
        </Text>
      )}
      {invalid ? (
        <Text as="p" variant="caption" id={errorId}>
          {error}
        </Text>
      ) : null}
    </div>
  );
}
