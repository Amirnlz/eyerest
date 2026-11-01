// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ExerciseCue } from '../../src/renderer/components/ExerciseCue';
import { EXERCISE_IDS } from '../../src/renderer/exercise/exercises';

const css = readFileSync('src/renderer/components/ExerciseCue.css', 'utf8');

describe('ExerciseCue', () => {
  it.each(EXERCISE_IDS)('renders the %s picture, hidden from assistive tech', (id) => {
    const { container } = render(<ExerciseCue id={id} />);
    const cue = container.firstElementChild;
    expect(cue).toHaveClass('er-exercise-cue', `er-exercise-cue--${id}`);
    expect(cue).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('carries no text, so it never speaks twice', () => {
    const { container } = render(<ExerciseCue id="blink" />);
    expect(container).toHaveTextContent('');
  });
});

describe('ExerciseCue.css', () => {
  it('runs every animation only when motion is allowed', () => {
    const outside = css.replace(
      /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}\n/,
      '',
    );
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)/);
    expect(outside).not.toMatch(/animation\s*:/);
  });

  it('has a forced-colors block and no raw px, ms, colors or easings', () => {
    expect(css).toMatch(/@media \(forced-colors: active\)/);
    expect(css).not.toMatch(/\d+(\.\d+)?(px|ms)\b/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|cubic-bezier|\bease(-in|-out|-in-out)?\b/i);
  });
});
