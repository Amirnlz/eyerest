import { CSS_PREFIX, cssVarName } from './css';
import { elevationNames, elevations } from './elevation';
import type { Elevation, ElevationName } from './elevation';

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

export function buildElevationCss(): string {
  const lines = [`  ${elevationVar('flat')}: none;`];
  for (const name of elevationNames) {
    lines.push(`  ${elevationVar(name)}: ${elevationValue(elevations[name])};`);
  }
  return `:root {\n${lines.join('\n')}\n}\n`;
}
