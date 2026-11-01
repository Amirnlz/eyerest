/** The guided-exercises switch. `set` stores it and tells every window. */
export interface ExercisesPort {
  get(): boolean;
  set(next: boolean): void;
}

/** Where a change goes. In the app this is a push to every renderer. */
export interface ExercisesOutput {
  push(enabled: boolean): void;
}
