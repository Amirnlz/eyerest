import { CSS_PREFIX } from './css';
import {
  durations,
  easings,
  effectNames,
  effectUnits,
  effects,
  reducedEffects,
} from './motion';
import type { DurationName, EasingName, EffectName } from './motion';

const KEBAB: Readonly<Record<EffectName, string>> = {
  pressScale: 'press-scale',
  enterOffset: 'enter-offset',
  exitOffset: 'exit-offset',
  blur: 'blur',
  stagger: 'stagger',
};

export function durationVar(name: DurationName): string {
  return `--${CSS_PREFIX}-duration-${name}`;
}

export function easingVar(name: EasingName): string {
  return `--${CSS_PREFIX}-ease-${name}`;
}

export function effectVar(name: EffectName): string {
  return `--${CSS_PREFIX}-motion-${KEBAB[name]}`;
}

function effectDeclaration(name: EffectName, value: number): string {
  return `${effectVar(name)}: ${value}${effectUnits[name]};`;
}

export function buildMotionCss(): string {
  const lines: string[] = [];
  for (const name of Object.keys(durations) as DurationName[]) {
    lines.push(`  ${durationVar(name)}: ${durations[name]}ms;`);
  }
  for (const name of Object.keys(easings) as EasingName[]) {
    lines.push(`  ${easingVar(name)}: ${easings[name]};`);
  }
  for (const name of effectNames) {
    lines.push(`  ${effectDeclaration(name, effects[name])}`);
  }
  const reduced = effectNames
    .filter((name) => reducedEffects[name] !== effects[name])
    .map((name) => `    ${effectDeclaration(name, reducedEffects[name])}`);
  return [
    `:root {\n${lines.join('\n')}\n}`,
    '',
    `@media (prefers-reduced-motion: reduce) {\n  :root {\n${reduced.join('\n')}\n  }\n}`,
    '',
  ].join('\n');
}
