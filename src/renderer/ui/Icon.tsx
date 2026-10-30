import { ICON_GRID, icons, type IconName, type IconShape } from './icons';
import './Icon.css';

export type IconSize = 'sm' | 'md' | 'lg';
export type IconWeight = 'regular' | 'medium' | 'bold';
export type IconVariant = 'outline' | 'fill';

/**
 * Rendered stroke width in pixels, matched to the weight of the text beside the icon
 * (better-ui): 1.5 at weight 400, 2 at 500 to 600, 2.5 at 700. `vector-effect: non-scaling-stroke`
 * in the CSS keeps these widths in screen pixels whatever the icon size.
 */
export const strokeWidths: Readonly<Record<IconWeight, number>> = {
  regular: 1.5,
  medium: 2,
  bold: 2.5,
};

export interface IconProps {
  readonly name: IconName;
  /** `sm` 1em, `md` 1.25em (inline with text), `lg` 1.5rem (standalone). */
  readonly size?: IconSize;
  /** Match the adjacent text: `regular` 400, `medium` 500 to 600, `bold` 700. */
  readonly weight?: IconWeight;
  /** Outline is the default. Fill marks an active or selected state. */
  readonly variant?: IconVariant;
  /**
   * Accessible name. Without it the icon is decorative and hidden from assistive tech, which is
   * right when text or a labelled button names it.
   */
  readonly label?: string;
}

export function iconClassName(name: IconName, size: IconSize): string {
  const classes = ['er-icon', `er-icon--${size}`];
  if (icons[name].mirrorInRtl) classes.push('er-icon--mirror');
  return classes.join(' ');
}

function renderShape(shape: IconShape, key: number, filled: boolean) {
  const fill = filled && shape.fillable === true ? 'currentColor' : 'none';
  return shape.kind === 'path' ? (
    <path key={key} d={shape.d} fill={fill} />
  ) : (
    <circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} fill={fill} />
  );
}

/** One SVG, recolored by CSS through `currentColor`. State never swaps the asset. */
export function Icon({
  name,
  size = 'md',
  weight = 'medium',
  variant = 'outline',
  label,
}: IconProps) {
  const { shapes } = icons[name];
  const filled = variant === 'fill';
  const a11y =
    label === undefined
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'img', 'aria-label': label } as const);

  return (
    <svg
      className={iconClassName(name, size)}
      viewBox={`0 0 ${ICON_GRID} ${ICON_GRID}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidths[weight]}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...a11y}
    >
      {shapes.map((shape, index) => renderShape(shape, index, filled))}
    </svg>
  );
}
