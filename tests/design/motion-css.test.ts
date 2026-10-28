import { describe, expect, it } from 'vitest';
import { buildDesignCss } from '../../src/design/build';
import {
  buildMotionCss,
  durationVar,
  easingVar,
  effectVar,
} from '../../src/design/motion-css';
import {
  durations,
  easings,
  effectNames,
  effects,
} from '../../src/design/motion';

const css = buildMotionCss();
const [base = '', reduced = ''] = css.split(
  '@media (prefers-reduced-motion: reduce)',
);

describe('buildMotionCss', () => {
  it('declares every duration, easing and effect once in the base block', () => {
    for (const [name, ms] of Object.entries(durations)) {
      const v = durationVar(name as keyof typeof durations);
      expect(base.split(`${v}:`)).toHaveLength(2);
      expect(base).toContain(`${v}: ${ms}ms;`);
    }
    for (const [name, curve] of Object.entries(easings)) {
      expect(base).toContain(
        `${easingVar(name as keyof typeof easings)}: ${curve};`,
      );
    }
    for (const name of effectNames) {
      expect(base.split(`${effectVar(name)}:`)).toHaveLength(2);
    }
  });

  it('emits the exact base values with units', () => {
    expect(base).toContain('--er-motion-press-scale: 0.96;');
    expect(base).toContain('--er-motion-enter-offset: 0.75rem;');
    expect(base).toContain('--er-motion-exit-offset: -0.75rem;');
    expect(base).toContain('--er-motion-blur: 0.25rem;');
    expect(base).toContain(`--er-motion-stagger: ${effects.stagger}ms;`);
  });

  it('overrides only movement, scale and blur under prefers-reduced-motion: reduce', () => {
    expect(reduced).toContain('--er-motion-press-scale: 1;');
    expect(reduced).toContain('--er-motion-enter-offset: 0rem;');
    expect(reduced).toContain('--er-motion-exit-offset: 0rem;');
    expect(reduced).toContain('--er-motion-blur: 0rem;');
    expect(reduced).not.toContain('--er-duration-');
    expect(reduced).not.toContain('--er-motion-stagger');
    expect(reduced).not.toContain('--er-ease-');
  });

  it('never uses transition: all or px', () => {
    expect(css).not.toMatch(/\ball\b|\d\s*px/);
  });

  it('is part of the full stylesheet', () => {
    expect(buildDesignCss()).toContain(css);
  });
});
