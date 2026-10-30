import type { ComponentPropsWithoutRef } from 'react';
import './VisuallyHidden.css';

export type VisuallyHiddenProps = Omit<ComponentPropsWithoutRef<'span'>, 'className'>;

/**
 * Content for assistive technology only. It stays in the accessibility tree and takes no space,
 * unlike `display: none` or `hidden`, which remove it.
 */
export function VisuallyHidden(props: VisuallyHiddenProps) {
  return <span {...props} className="er-visually-hidden" />;
}
