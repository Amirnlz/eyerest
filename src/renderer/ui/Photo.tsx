import type { ComponentPropsWithRef } from 'react';
import './Photo.css';

export interface PhotoProps extends Omit<
  ComponentPropsWithRef<'img'>,
  'className' | 'alt'
> {
  /** Required. Pass `""` only when the image is purely decorative. */
  readonly alt: string;
  /**
   * Transparent artwork (logos, illustrations) has no photographic edge to define, so it skips
   * the outline (better-ui).
   */
  readonly artwork?: boolean;
}

export function photoClassName(isArtwork: boolean): string {
  return isArtwork ? 'er-photo er-photo--artwork' : 'er-photo';
}

/** Content image with a 1px inset outline in pure black or white at 10%, so its edge never bleeds. */
export function Photo({ artwork = false, alt, ...props }: PhotoProps) {
  return <img {...props} alt={alt} className={photoClassName(artwork)} />;
}
