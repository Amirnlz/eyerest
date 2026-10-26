export type RestKind = 'eye' | 'long';

/**
 * Engine state. A discriminated union keeps impossible states unrepresentable:
 * for example, only `resting` carries an end time and a rest kind.
 *
 * `restsDone` counts rest slots consumed (completed or skipped). It decides
 * whether the next rest is an eye rest or a long rest. Postponing does not
 * consume a slot.
 */
export type EngineState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'working'; readonly restAt: number; readonly restsDone: number }
  | { readonly phase: 'warning'; readonly restAt: number; readonly restsDone: number }
  | {
      readonly phase: 'resting';
      readonly kind: RestKind;
      readonly endsAt: number;
      readonly restsDone: number;
    };

export type Phase = EngineState['phase'];

export const IDLE_STATE: EngineState = Object.freeze({ phase: 'idle' });

/** Side-effect-free notifications describing what a transition did. */
export type EngineEvent =
  | { readonly type: 'started' }
  | { readonly type: 'stopped' }
  | { readonly type: 'warning-started'; readonly restAt: number }
  | { readonly type: 'rest-started'; readonly kind: RestKind; readonly endsAt: number }
  | { readonly type: 'rest-completed'; readonly kind: RestKind }
  | { readonly type: 'rest-skipped'; readonly kind: RestKind }
  | { readonly type: 'rest-postponed'; readonly newRestAt: number };

export type EngineAction =
  | { readonly type: 'start'; readonly now: number }
  | { readonly type: 'stop' }
  | { readonly type: 'tick'; readonly now: number }
  | { readonly type: 'skip'; readonly now: number }
  | { readonly type: 'postpone'; readonly now: number };

export interface Transition {
  readonly state: EngineState;
  readonly events: readonly EngineEvent[];
}

/**
 * Milliseconds left in the current countdown, or null when the phase has no
 * countdown to show (idle, or working before the warning window opens).
 */
export function remainingMs(state: EngineState, now: number): number | null {
  switch (state.phase) {
    case 'warning':
      return Math.max(0, state.restAt - now);
    case 'resting':
      return Math.max(0, state.endsAt - now);
    default:
      return null;
  }
}
