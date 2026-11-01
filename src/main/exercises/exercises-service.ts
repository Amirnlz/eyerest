import type { PreferencesStore } from '../preferences/preferences-store';
import type { ExercisesOutput, ExercisesPort } from './ports';

/**
 * Owns the guided-exercises switch: stores it, then pushes it so the open overlay follows at
 * once. Setting the current value again does nothing (no write, no push). Same shape as
 * `ThemeService`.
 */
export class ExercisesService implements ExercisesPort {
  constructor(
    private readonly store: Pick<PreferencesStore, 'get' | 'update'>,
    private readonly output: ExercisesOutput,
  ) {}

  get(): boolean {
    return this.store.get().exercises;
  }

  set(next: boolean): void {
    if (next === this.store.get().exercises) return;
    this.store.update({ exercises: next });
    this.output.push(next);
  }
}
