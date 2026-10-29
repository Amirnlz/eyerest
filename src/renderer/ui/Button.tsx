import type { ComponentPropsWithRef } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'className' | 'type'
> {
  /** `primary`: the one main action. `secondary`: raised. `quiet`: flat, for low emphasis. */
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Opt out of the press scale where the motion would distract. */
  readonly static?: boolean;
  readonly type?: 'button' | 'submit' | 'reset';
}

export function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  isStatic: boolean,
): string {
  const classes = ['er-button', `er-button--${variant}`, `er-button--${size}`];
  if (isStatic) classes.push('er-button--static');
  return classes.join(' ');
}

/** Design-system button. Native `<button>`: keyboard, focus and disabled behavior come free. */
export function Button({
  variant = 'secondary',
  size = 'md',
  static: isStatic = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClassName(variant, size, isStatic)}
    />
  );
}
