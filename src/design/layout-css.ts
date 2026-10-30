import { CSS_PREFIX } from './css';
import {
  opacity,
  optical,
  radius,
  radiusFull,
  space,
  stroke,
  zIndex,
} from './layout';

export function spaceVar(name: keyof typeof space): string {
  return `--${CSS_PREFIX}-space-${name}`;
}

export function radiusVar(name: keyof typeof radius | 'full'): string {
  return `--${CSS_PREFIX}-radius-${name}`;
}

export function zIndexVar(name: keyof typeof zIndex): string {
  return `--${CSS_PREFIX}-z-${name}`;
}

export function strokeVar(name: keyof typeof stroke): string {
  return `--${CSS_PREFIX}-stroke-${name === 'focusOffset' ? 'focus-offset' : name}`;
}

export function opacityVar(name: keyof typeof opacity): string {
  return `--${CSS_PREFIX}-opacity-${name}`;
}

export function opticalVar(name: keyof typeof optical): string {
  return `--${CSS_PREFIX}-optical-${name}`;
}

export function buildLayoutCss(): string {
  const lines: string[] = [];
  for (const name of Object.keys(space) as unknown as (keyof typeof space)[]) {
    lines.push(`  ${spaceVar(name)}: ${space[name]}rem;`);
  }
  for (const name of Object.keys(radius) as (keyof typeof radius)[]) {
    lines.push(`  ${radiusVar(name)}: ${radius[name]}rem;`);
  }
  lines.push(`  ${radiusVar('full')}: ${radiusFull};`);
  for (const name of Object.keys(stroke) as (keyof typeof stroke)[]) {
    lines.push(`  ${strokeVar(name)}: ${stroke[name]};`);
  }
  for (const name of Object.keys(optical) as (keyof typeof optical)[]) {
    lines.push(`  ${opticalVar(name)}: ${optical[name]}rem;`);
  }
  for (const name of Object.keys(opacity) as (keyof typeof opacity)[]) {
    lines.push(`  ${opacityVar(name)}: ${opacity[name]};`);
  }
  for (const name of Object.keys(zIndex) as (keyof typeof zIndex)[]) {
    lines.push(`  ${zIndexVar(name)}: ${zIndex[name]};`);
  }
  return `:root {\n${lines.join('\n')}\n}\n`;
}
