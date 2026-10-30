import type { ComponentPropsWithoutRef, ElementType } from 'react';
import type { TypeRoleName } from '../../design/typography';
import './Text.css';

export type TextVariant = TypeRoleName;
export type TextTone = 'primary' | 'secondary';
export type TextElement =
  | 'p'
  | 'span'
  | 'div'
  | 'label'
  | 'legend'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6';

export interface TextProps extends Omit<
  ComponentPropsWithoutRef<'p'>,
  'className'
> {
  /** A role from the type scale. Not an ARIA role. */
  readonly variant?: TextVariant;
  readonly tone?: TextTone;
  /** Element to render. Choose headings by document structure, not by size. */
  readonly as?: TextElement;
}

/** Block roles default to `p`, inline roles to `span`. Headings are always explicit. */
export const defaultElement: Readonly<Record<TextVariant, TextElement>> = {
  display: 'p',
  title: 'p',
  body: 'p',
  label: 'span',
  caption: 'span',
};

export function textClassName(variant: TextVariant, tone: TextTone): string {
  return ['er-text', `er-text--${variant}`, `er-text--${tone}`].join(' ');
}

/** Text in one of the type-scale roles. Size, weight and numerals come from tokens only. */
export function Text({
  variant = 'body',
  tone = 'primary',
  as,
  ...props
}: TextProps) {
  // `ElementType`, not the `TextElement` union: a union that includes `label` makes TypeScript
  // demand label-only props from props typed for `<p>` (V10).
  const Element: ElementType = as ?? defaultElement[variant];
  return <Element {...props} className={textClassName(variant, tone)} />;
}
