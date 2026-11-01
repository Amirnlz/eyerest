import { useEffect, useState } from 'react';
import type { EyerestApi } from '../../shared/ipc';

export type ExercisesSource = Pick<EyerestApi, 'onExercises'>;

/**
 * Whether guided exercises are on. Starts from the value main put in the window's URL and follows
 * the tray checkbox through pushes.
 */
export function useExercisesEnabled(source: ExercisesSource, initial: boolean): boolean {
  const [enabled, setEnabled] = useState(initial);

  useEffect(() => source.onExercises(setEnabled), [source]);

  return enabled;
}
