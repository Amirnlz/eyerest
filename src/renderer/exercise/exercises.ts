/** The guided eye exercises, in the order they run during one eye rest. */
export const EXERCISE_IDS = ['look-far', 'roll', 'blink'] as const;
export type ExerciseId = (typeof EXERCISE_IDS)[number];

/**
 * Which exercise to show. The rest is split into equal parts, one per exercise, by elapsed time.
 * Pure: both numbers are whole seconds from the countdown, so nothing here reads a clock.
 * `totalSeconds` is the length of the whole rest; anything unusable shows the first exercise.
 */
export function exerciseIndex(secondsLeft: number, totalSeconds: number): number {
  if (!Number.isFinite(secondsLeft) || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return 0;
  const elapsed = Math.min(Math.max(totalSeconds - secondsLeft, 0), totalSeconds);
  const part = totalSeconds / EXERCISE_IDS.length;
  return Math.min(EXERCISE_IDS.length - 1, Math.floor(elapsed / part));
}

export function exerciseAt(secondsLeft: number, totalSeconds: number): ExerciseId {
  return EXERCISE_IDS[exerciseIndex(secondsLeft, totalSeconds)] ?? EXERCISE_IDS[0];
}
