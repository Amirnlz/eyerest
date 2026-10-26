import { describe, expect, it } from 'vitest';
import { createConfig } from '../../src/core/config';
import { nextRestKind, transition } from '../../src/core/engine';
import {
  IDLE_STATE,
  remainingMs,
  type EngineAction,
  type EngineEvent,
  type EngineState,
} from '../../src/core/state';

const config = createConfig();
const MIN = 60_000;
const SEC = 1_000;

/** Applies actions in order and collects every emitted event. */
function run(initial: EngineState, actions: EngineAction[]) {
  let state = initial;
  const events: EngineEvent[] = [];
  for (const action of actions) {
    const result = transition(state, action, config);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

/** Starts at t=0 and ticks until the first rest begins. Returns the state. */
function atFirstRest(): EngineState {
  return run(IDLE_STATE, [
    { type: 'start', now: 0 },
    { type: 'tick', now: 20 * MIN },
  ]).state;
}

describe('start / stop', () => {
  it('start moves idle to working and schedules the first rest in 20 minutes', () => {
    const { state, events } = run(IDLE_STATE, [{ type: 'start', now: 1_000 }]);
    expect(state).toEqual({ phase: 'working', restAt: 1_000 + 20 * MIN, restsDone: 0 });
    expect(events).toEqual([{ type: 'started' }]);
  });

  it('start is ignored when already running', () => {
    const running = run(IDLE_STATE, [{ type: 'start', now: 0 }]).state;
    const result = transition(running, { type: 'start', now: 5 * MIN }, config);
    expect(result.state).toBe(running);
    expect(result.events).toEqual([]);
  });

  it('stop returns to idle from any running phase', () => {
    const resting = atFirstRest();
    const result = transition(resting, { type: 'stop' }, config);
    expect(result.state).toEqual({ phase: 'idle' });
    expect(result.events).toEqual([{ type: 'stopped' }]);
  });

  it('stop is a no-op when idle', () => {
    const result = transition(IDLE_STATE, { type: 'stop' }, config);
    expect(result.state).toBe(IDLE_STATE);
    expect(result.events).toEqual([]);
  });

  it('tick is a no-op when idle', () => {
    const result = transition(IDLE_STATE, { type: 'tick', now: 999_999 }, config);
    expect(result.state).toBe(IDLE_STATE);
    expect(result.events).toEqual([]);
  });
});

describe('warning phase', () => {
  const started = run(IDLE_STATE, [{ type: 'start', now: 0 }]).state;

  it('stays working before the warning window opens', () => {
    const result = transition(started, { type: 'tick', now: 20 * MIN - 15 * SEC - 1 }, config);
    expect(result.state.phase).toBe('working');
    expect(result.events).toEqual([]);
  });

  it('enters warning exactly 15 seconds before the rest', () => {
    const result = transition(started, { type: 'tick', now: 20 * MIN - 15 * SEC }, config);
    expect(result.state).toEqual({ phase: 'warning', restAt: 20 * MIN, restsDone: 0 });
    expect(result.events).toEqual([{ type: 'warning-started', restAt: 20 * MIN }]);
  });

  it('does not re-emit warning-started on later ticks', () => {
    const { events } = run(started, [
      { type: 'tick', now: 20 * MIN - 15 * SEC },
      { type: 'tick', now: 20 * MIN - 10 * SEC },
      { type: 'tick', now: 20 * MIN - 5 * SEC },
    ]);
    expect(events.filter((e) => e.type === 'warning-started')).toHaveLength(1);
  });

  it('reports the remaining countdown during warning', () => {
    const { state } = run(started, [{ type: 'tick', now: 20 * MIN - 15 * SEC }]);
    expect(remainingMs(state, 20 * MIN - 15 * SEC)).toBe(15 * SEC);
    expect(remainingMs(state, 20 * MIN - 4 * SEC)).toBe(4 * SEC);
  });

  it('ignores skip and postpone (buttons only exist during the rest)', () => {
    const { state: warning } = run(started, [{ type: 'tick', now: 20 * MIN - 15 * SEC }]);
    for (const type of ['skip', 'postpone'] as const) {
      const result = transition(warning, { type, now: 20 * MIN - 10 * SEC }, config);
      expect(result.state).toBe(warning);
      expect(result.events).toEqual([]);
    }
  });
});

describe('rest phase', () => {
  it('starts an eye rest of 20 seconds when the rest time arrives', () => {
    const result = transition(
      run(IDLE_STATE, [{ type: 'start', now: 0 }]).state,
      { type: 'tick', now: 20 * MIN },
      config,
    );
    expect(result.state).toEqual({
      phase: 'resting',
      kind: 'eye',
      endsAt: 20 * MIN + 20 * SEC,
      restsDone: 0,
    });
    expect(result.events).toEqual([
      { type: 'rest-started', kind: 'eye', endsAt: 20 * MIN + 20 * SEC },
    ]);
  });

  it('goes straight from warning to resting without skipping the rest', () => {
    const { state, events } = run(IDLE_STATE, [
      { type: 'start', now: 0 },
      { type: 'tick', now: 20 * MIN - 15 * SEC },
      { type: 'tick', now: 20 * MIN },
    ]);
    expect(state.phase).toBe('resting');
    expect(events.map((e) => e.type)).toEqual(['started', 'warning-started', 'rest-started']);
  });

  it('counts down during the rest', () => {
    const resting = atFirstRest();
    expect(remainingMs(resting, 20 * MIN)).toBe(20 * SEC);
    expect(remainingMs(resting, 20 * MIN + 12 * SEC)).toBe(8 * SEC);
  });

  it('does not end the rest early', () => {
    const resting = atFirstRest();
    const result = transition(resting, { type: 'tick', now: 20 * MIN + 20 * SEC - 1 }, config);
    expect(result.state).toBe(resting);
  });

  it('completes the rest and schedules the next one 20 minutes later', () => {
    const resting = atFirstRest();
    const endAt = 20 * MIN + 20 * SEC;
    const result = transition(resting, { type: 'tick', now: endAt }, config);
    expect(result.state).toEqual({
      phase: 'working',
      restAt: endAt + 20 * MIN,
      restsDone: 1,
    });
    expect(result.events).toEqual([{ type: 'rest-completed', kind: 'eye' }]);
  });

  it('starts the rest from "now" when a tick arrives late (e.g. after sleep)', () => {
    const started = run(IDLE_STATE, [{ type: 'start', now: 0 }]).state;
    const lateNow = 45 * MIN;
    const result = transition(started, { type: 'tick', now: lateNow }, config);
    expect(result.state).toMatchObject({ phase: 'resting', endsAt: lateNow + 20 * SEC });
  });
});

describe('long rest cycle', () => {
  it.each([
    [0, 'eye'],
    [1, 'eye'],
    [2, 'long'],
    [3, 'eye'],
    [4, 'eye'],
    [5, 'long'],
  ] as const)('after %i rests done the next rest is %s', (restsDone, expected) => {
    expect(nextRestKind(restsDone, config)).toBe(expected);
  });

  it('offers a 10-minute rest after three cycles', () => {
    let state: EngineState = run(IDLE_STATE, [{ type: 'start', now: 0 }]).state;
    let now = 0;
    const kinds: string[] = [];

    for (let i = 0; i < 3; i++) {
      now = (state as { restAt: number }).restAt;
      const started = transition(state, { type: 'tick', now }, config);
      const resting = started.state;
      if (resting.phase !== 'resting') throw new Error('expected resting');
      kinds.push(resting.kind);
      now = resting.endsAt;
      state = transition(resting, { type: 'tick', now }, config).state;
    }

    expect(kinds).toEqual(['eye', 'eye', 'long']);
  });

  it('long rest lasts 10 minutes', () => {
    const state: EngineState = { phase: 'working', restAt: 1_000, restsDone: 2 };
    const result = transition(state, { type: 'tick', now: 1_000 }, config);
    expect(result.state).toEqual({
      phase: 'resting',
      kind: 'long',
      endsAt: 1_000 + 10 * MIN,
      restsDone: 2,
    });
  });

  it('restarts the cycle after a long rest', () => {
    const resting: EngineState = {
      phase: 'resting',
      kind: 'long',
      endsAt: 5_000,
      restsDone: 2,
    };
    const { state } = transition(resting, { type: 'tick', now: 5_000 }, config);
    expect(state).toMatchObject({ phase: 'working', restsDone: 3 });
    expect(nextRestKind(3, config)).toBe('eye');
  });
});

describe('skip', () => {
  it('skips the current rest and schedules the next in 20 minutes', () => {
    const resting = atFirstRest();
    const now = 20 * MIN + 5 * SEC;
    const result = transition(resting, { type: 'skip', now }, config);
    expect(result.state).toEqual({
      phase: 'working',
      restAt: now + 20 * MIN,
      restsDone: 1,
    });
    expect(result.events).toEqual([{ type: 'rest-skipped', kind: 'eye' }]);
  });

  it('counts a skipped rest toward the long-rest cycle', () => {
    const resting: EngineState = {
      phase: 'resting',
      kind: 'eye',
      endsAt: 30_000,
      restsDone: 1,
    };
    const { state } = transition(resting, { type: 'skip', now: 10_000 }, config);
    expect(state).toMatchObject({ restsDone: 2 });
    expect(nextRestKind(2, config)).toBe('long');
  });

  it('is ignored outside the resting phase', () => {
    const working = run(IDLE_STATE, [{ type: 'start', now: 0 }]).state;
    const result = transition(working, { type: 'skip', now: 1_000 }, config);
    expect(result.state).toBe(working);
    expect(result.events).toEqual([]);
  });
});

describe('postpone', () => {
  it('postpones the rest by 5 minutes', () => {
    const resting = atFirstRest();
    const now = 20 * MIN + 3 * SEC;
    const result = transition(resting, { type: 'postpone', now }, config);
    expect(result.state).toEqual({
      phase: 'working',
      restAt: now + 5 * MIN,
      restsDone: 0,
    });
    expect(result.events).toEqual([{ type: 'rest-postponed', newRestAt: now + 5 * MIN }]);
  });

  it('does not consume the rest slot', () => {
    const resting: EngineState = {
      phase: 'resting',
      kind: 'long',
      endsAt: 700_000,
      restsDone: 2,
    };
    const { state } = transition(resting, { type: 'postpone', now: 100_000 }, config);
    expect(state).toMatchObject({ restsDone: 2 });
    expect(nextRestKind(2, config)).toBe('long');
  });

  it('shows the warning again before the postponed rest', () => {
    const resting = atFirstRest();
    const now = 20 * MIN;
    const { state: working } = transition(resting, { type: 'postpone', now }, config);
    const result = transition(working, { type: 'tick', now: now + 5 * MIN - 15 * SEC }, config);
    expect(result.state.phase).toBe('warning');
  });

  it('shifts every later rest by the same 5 minutes', () => {
    const normal = run(IDLE_STATE, [
      { type: 'start', now: 0 },
      { type: 'tick', now: 20 * MIN },
      { type: 'tick', now: 20 * MIN + 20 * SEC },
    ]).state;

    const postponed = run(IDLE_STATE, [
      { type: 'start', now: 0 },
      { type: 'tick', now: 20 * MIN },
      { type: 'postpone', now: 20 * MIN },
      { type: 'tick', now: 25 * MIN },
      { type: 'tick', now: 25 * MIN + 20 * SEC },
    ]).state;

    if (normal.phase !== 'working' || postponed.phase !== 'working') {
      throw new Error('expected working');
    }
    expect(postponed.restAt - normal.restAt).toBe(5 * MIN);
  });

  it('can be postponed repeatedly', () => {
    const { state } = run(IDLE_STATE, [
      { type: 'start', now: 0 },
      { type: 'tick', now: 20 * MIN },
      { type: 'postpone', now: 20 * MIN },
      { type: 'tick', now: 25 * MIN },
      { type: 'postpone', now: 25 * MIN },
    ]);
    expect(state).toEqual({ phase: 'working', restAt: 30 * MIN, restsDone: 0 });
  });

  it('is ignored outside the resting phase', () => {
    const working = run(IDLE_STATE, [{ type: 'start', now: 0 }]).state;
    const result = transition(working, { type: 'postpone', now: 1_000 }, config);
    expect(result.state).toBe(working);
    expect(result.events).toEqual([]);
  });
});

describe('remainingMs', () => {
  it('is null when there is no countdown to show', () => {
    expect(remainingMs(IDLE_STATE, 0)).toBeNull();
    expect(remainingMs({ phase: 'working', restAt: 1_000, restsDone: 0 }, 0)).toBeNull();
  });

  it('never goes negative', () => {
    expect(remainingMs({ phase: 'warning', restAt: 1_000, restsDone: 0 }, 5_000)).toBe(0);
  });
});
