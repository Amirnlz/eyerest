import type { RestConfig } from './config';
import {
  IDLE_STATE,
  type EngineAction,
  type EngineEvent,
  type EngineState,
  type RestKind,
  type Transition,
} from './state';

/** Which kind of rest comes after `restsDone` rest slots have been consumed. */
export function nextRestKind(restsDone: number, config: RestConfig): RestKind {
  return (restsDone + 1) % config.cyclesBeforeLongRest === 0 ? 'long' : 'eye';
}

function restDuration(kind: RestKind, config: RestConfig): number {
  return kind === 'long' ? config.longRestMs : config.eyeRestMs;
}

function unchanged(state: EngineState): Transition {
  return { state, events: [] };
}

function working(restAt: number, restsDone: number): EngineState {
  return { phase: 'working', restAt, restsDone };
}

/**
 * Pure state machine. No clocks, timers or I/O: the caller supplies `now`.
 * Given the same (state, action, config) it always returns the same result,
 * which makes every rule below directly unit-testable.
 *
 * Rules:
 * - working -> warning when `warningMs` remain before the rest.
 * - warning/working -> resting once `restAt` is reached. If a tick arrives
 *   late (sleep, suspended process) the rest starts from `now`, so the user
 *   always gets a full-length rest.
 * - resting -> working when the rest ends; next rest is scheduled
 *   `workIntervalMs` after `now`.
 * - skip (resting only): consumes the rest slot, next rest in `workIntervalMs`.
 * - postpone (resting only): does not consume the slot; next rest in
 *   `postponeMs`. Because later rests are scheduled relative to when the
 *   previous one finished, every later rest shifts by the same amount.
 */
export function transition(
  state: EngineState,
  action: EngineAction,
  config: RestConfig,
): Transition {
  switch (action.type) {
    case 'start': {
      if (state.phase !== 'idle') return unchanged(state);
      return {
        state: working(action.now + config.workIntervalMs, 0),
        events: [{ type: 'started' }],
      };
    }

    case 'stop': {
      if (state.phase === 'idle') return unchanged(state);
      return { state: IDLE_STATE, events: [{ type: 'stopped' }] };
    }

    case 'tick':
      return tick(state, action.now, config);

    case 'skip': {
      if (state.phase !== 'resting') return unchanged(state);
      return {
        state: working(action.now + config.workIntervalMs, state.restsDone + 1),
        events: [{ type: 'rest-skipped', kind: state.kind }],
      };
    }

    case 'postpone': {
      if (state.phase !== 'resting') return unchanged(state);
      const newRestAt = action.now + config.postponeMs;
      return {
        state: working(newRestAt, state.restsDone),
        events: [{ type: 'rest-postponed', newRestAt }],
      };
    }
  }
}

function tick(state: EngineState, now: number, config: RestConfig): Transition {
  switch (state.phase) {
    case 'idle':
      return unchanged(state);

    case 'working':
    case 'warning': {
      if (now >= state.restAt) return beginRest(state.restsDone, now, config);

      const warningOpensAt = state.restAt - config.warningMs;
      if (state.phase === 'working' && now >= warningOpensAt) {
        const events: EngineEvent[] = [{ type: 'warning-started', restAt: state.restAt }];
        return {
          state: { phase: 'warning', restAt: state.restAt, restsDone: state.restsDone },
          events,
        };
      }
      return unchanged(state);
    }

    case 'resting': {
      if (now < state.endsAt) return unchanged(state);
      return {
        state: working(now + config.workIntervalMs, state.restsDone + 1),
        events: [{ type: 'rest-completed', kind: state.kind }],
      };
    }
  }
}

function beginRest(restsDone: number, now: number, config: RestConfig): Transition {
  const kind = nextRestKind(restsDone, config);
  const endsAt = now + restDuration(kind, config);
  return {
    state: { phase: 'resting', kind, endsAt, restsDone },
    events: [{ type: 'rest-started', kind, endsAt }],
  };
}
