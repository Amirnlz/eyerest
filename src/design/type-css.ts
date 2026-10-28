import { CSS_PREFIX } from './css';
import {
  fontFamilies,
  fontWeights,
  typeRoleNames,
  typeRoles,
} from './typography';
import type { FontFamilyName, TypeRoleName } from './typography';

export type TypeProperty =
  | 'size'
  | 'line-height'
  | 'weight'
  | 'letter-spacing'
  | 'numeric';
export const typeProperties: readonly TypeProperty[] = [
  'size',
  'line-height',
  'weight',
  'letter-spacing',
  'numeric',
];

export function fontFamilyVar(name: FontFamilyName): string {
  return `--${CSS_PREFIX}-font-family-${name}`;
}

export function typeVar(role: TypeRoleName, property: TypeProperty): string {
  return `--${CSS_PREFIX}-type-${role}-${property}`;
}

export function buildTypeCss(): string {
  const lines: string[] = [];
  for (const name of Object.keys(fontFamilies) as FontFamilyName[]) {
    lines.push(`  ${fontFamilyVar(name)}: ${fontFamilies[name]};`);
  }
  for (const role of typeRoleNames) {
    const t = typeRoles[role];
    lines.push(
      `  ${typeVar(role, 'size')}: ${t.size}rem;`,
      `  ${typeVar(role, 'line-height')}: ${t.lineHeight};`,
      `  ${typeVar(role, 'weight')}: ${fontWeights[t.weight]};`,
      `  ${typeVar(role, 'letter-spacing')}: ${t.letterSpacing}em;`,
      `  ${typeVar(role, 'numeric')}: ${t.tabularNums ? 'tabular-nums' : 'normal'};`,
    );
  }
  return `:root {\n${lines.join('\n')}\n}\n`;
}
