import type { ComponentPropsWithoutRef } from 'react';
import type { ElevationName } from '../../design/elevation';
import './Surface.css';

export type SurfaceElevation = ElevationName | 'flat';
export type SurfacePadding = 'none' | 'xs' | 'sm' | 'md' | 'lg';
export type SurfaceRadius = 'sm' | 'md' | 'lg';
export type SurfaceElement = 'div' | 'section' | 'aside' | 'article';

export interface SurfaceProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'className'
> {
  /** Neumorphic depth. `raised-*` stands out of the canvas, `inset-*` sinks into it. */
  readonly elevation?: SurfaceElevation;
  readonly padding?: SurfacePadding;
  readonly radius?: SurfaceRadius;
  /** Landmark or container element. Give a `section` an accessible name to expose a region. */
  readonly as?: SurfaceElement;
}

export function surfaceClassName(
  elevation: SurfaceElevation,
  padding: SurfacePadding,
  radius: SurfaceRadius,
): string {
  return [
    'er-surface',
    `er-surface--${elevation}`,
    `er-surface--pad-${padding}`,
    `er-surface--radius-${radius}`,
  ].join(' ');
}

/** Panel on the canvas. Depth comes from paired shadows, never from a border or a hue. */
export function Surface({
  elevation = 'raised-md',
  padding = 'md',
  radius = 'lg',
  as: Element = 'div',
  ...props
}: SurfaceProps) {
  return (
    <Element
      {...props}
      className={surfaceClassName(elevation, padding, radius)}
    />
  );
}
