import { CSS_PREFIX, cssVarName } from './css';
import { elevationNames, elevations } from './elevation';
import type { Elevation, ElevationName } from './elevation';
import { themedBlocks } from './theme-scope';

export function elevationVar(name: ElevationName | 'flat'): string {
  return `--${CSS_PREFIX}-elevation-${name}`;
}

const LIGHT = `var(${cssVarName('shadow-light')})`;
const DARK = `var(${cssVarName('shadow-dark')})`;

/** Two layers, light source top-left: light shadow toward it, dark shadow away from it. */
export function elevationValue(e: Elevation): string {
  const inset = e.kind === 'inset' ? 'inset ' : '';
  const d = `${e.offset}rem`;
  const nd = `-${e.offset}rem`;
  const b = `${e.blur}rem`;
  return `${inset}${nd} ${nd} ${b} ${LIGHT}, ${inset}${d} ${d} ${b} ${DARK}`;
}

/**
 * Declared in every theme scope, not on a bare `:root`: the values use theme color variables,
 * which must resolve inside the scope that is active (see `themedBlocks`).
 */
export function buildElevationCss(): string {
  return themedBlocks((_theme, indent) => [
    `${indent}${elevationVar('flat')}: none;`,
    ...elevationNames.map(
      (name) =>
        `${indent}${elevationVar(name)}: ${elevationValue(elevations[name])};`,
    ),
  ]);
}
