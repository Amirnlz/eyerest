import type { ComponentPropsWithoutRef } from 'react';
import { formatCountdown } from '../format-countdown';
import { Text, type TextTone } from './Text';
import './Countdown.css';

export interface CountdownProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'className' | 'children' | 'role'
> {
  /** Whole seconds left. Shown as `20` under a minute and `m:ss` above it. */
  readonly seconds: number;
  readonly tone?: TextTone;
}

/**
 * Time left, in the `display` type role with tabular numerals so the digits do not jitter.
 * `role="timer"` has no implicit live region, so screen readers are not told every second
 * (rule A2). Pass `aria-label` to name it.
 */
export function Countdown({
  seconds,
  tone = 'primary',
  ...props
}: CountdownProps) {
  return (
    <div {...props} role="timer" className="er-countdown">
      <Text as="span" variant="display" tone={tone}>
        {formatCountdown(seconds)}
      </Text>
    </div>
  );
}
