import type { ComponentPropsWithRef } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'sm' | 'md';
export type ButtonIconPosition = 'start' | 'end';

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
  /**
   * Decorative icon beside the label. The button gives up `--er-optical-nudge` of padding on the
   * icon side (better-ui, optical alignment). For an icon-only button, pass an `Icon` as the child
   * with an `aria-label` instead.
   */
  readonly icon?: IconName;
  /** Logical side, so it flips in right-to-left layouts. */
  readonly iconPosition?: ButtonIconPosition;
}

export function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  isStatic: boolean,
  iconPosition?: ButtonIconPosition,
): string {
  const classes = ['er-button', `er-button--${variant}`, `er-button--${size}`];
  if (isStatic) classes.push('er-button--static');
  if (iconPosition !== undefined) classes.push(`er-button--icon-${iconPosition}`);
  return classes.join(' ');
}

/** Design-system button. Native `<button>`: keyboard, focus and disabled behavior come free. */
export function Button({
  variant = 'secondary',
  size = 'md',
  static: isStatic = false,
  type = 'button',
  icon,
  iconPosition = 'start',
  children,
  ...props
}: ButtonProps) {
  const glyph = icon === undefined ? null : <Icon name={icon} />;
  return (
    <button
      {...props}
      type={type}
      className={buttonClassName(
        variant,
        size,
        isStatic,
        icon === undefined ? undefined : iconPosition,
      )}
    >
      {iconPosition === 'start' ? glyph : null}
      {children}
      {iconPosition === 'end' ? glyph : null}
    </button>
  );
}
