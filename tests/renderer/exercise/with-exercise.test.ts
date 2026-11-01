import { describe, expect, it } from 'vitest';
import { copy } from '../../../src/renderer/copy';
import {
  HIDDEN_VIEW_MODEL,
  withExercise,
  type OverlayViewModel,
} from '../../../src/renderer/view-model';

const rest = (kind: 'eye' | 'long', seconds: number): OverlayViewModel => ({
  mode: 'rest',
  kind,
  title: copy.rest[kind].title,
  message: copy.rest[kind].message,
  seconds,
  countdown: String(seconds),
  skipLabel: copy.actions.skip,
  postponeLabel: copy.actions.postpone,
});

const warning: OverlayViewModel = {
  mode: 'warning',
  title: copy.warning.title,
  message: copy.warning.message,
  seconds: 10,
  countdown: '10',
};

describe('withExercise', () => {
  it('adds the exercise for the moment of an eye rest', () => {
    const result = withExercise(rest('eye', 20), { enabled: true, totalSeconds: 20 });
    expect(result).toMatchObject({
      mode: 'rest',
      exercise: { id: 'look-far', ...copy.exercises['look-far'] },
    });
  });

  it.each([
    [20, 'look-far'],
    [10, 'roll'],
    [2, 'blink'],
  ] as const)('%i s left shows %s', (seconds, id) => {
    const result = withExercise(rest('eye', seconds), { enabled: true, totalSeconds: 20 });
    expect(result.mode === 'rest' && result.exercise?.id).toBe(id);
  });

  it('keeps the rest fields it does not change', () => {
    const base = rest('eye', 20);
    expect(withExercise(base, { enabled: true, totalSeconds: 20 })).toMatchObject(base);
  });

  it('returns the same object when disabled', () => {
    const base = rest('eye', 20);
    expect(withExercise(base, { enabled: false, totalSeconds: 20 })).toBe(base);
  });

  it('keeps the static message for the long rest', () => {
    const base = rest('long', 600);
    expect(withExercise(base, { enabled: true, totalSeconds: 600 })).toBe(base);
  });

  it.each([warning, HIDDEN_VIEW_MODEL])('passes the %j view through', (base) => {
    expect(withExercise(base, { enabled: true, totalSeconds: 20 })).toBe(base);
  });
});
