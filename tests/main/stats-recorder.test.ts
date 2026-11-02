import { describe, expect, it, vi } from 'vitest';
import type { Snapshot } from '../../src/core/scheduler';
import type { EngineEvent } from '../../src/core/state';
import type { StatOutcome } from '../../src/core/stats';
import { StatsRecorder } from '../../src/main/stats/stats-recorder';

const snapshot: Snapshot = { state: { phase: 'idle' }, secondsRemaining: null };

function setup(now = 1_000) {
  let current = now;
  const record = vi.fn<(outcome: StatOutcome, at: number) => void>();
  const recorder = new StatsRecorder({ record }, { now: () => current });
  return {
    record,
    send: (events?: readonly EngineEvent[]) => recorder.send(snapshot, events),
    setNow: (value: number) => {
      current = value;
    },
  };
}

describe('StatsRecorder', () => {
  it('records each outcome event with the time it happened', () => {
    const { send, record } = setup(5_000);
    send([{ type: 'rest-completed', kind: 'eye' }]);
    send([{ type: 'rest-skipped', kind: 'eye' }]);
    send([{ type: 'rest-postponed', newRestAt: 9 }]);
    expect(record.mock.calls).toEqual([
      ['taken', 5_000],
      ['skipped', 5_000],
      ['postponed', 5_000],
    ]);
  });

  it('counts a rest swallowed by do not disturb as skipped', () => {
    const { send, record } = setup();
    send([{ type: 'rest-suppressed', kind: 'long' }]);
    expect(record).toHaveBeenCalledWith('skipped', 1_000);
  });

  it('ignores events that are not outcomes, and snapshots without events', () => {
    const { send, record } = setup();
    send([
      { type: 'started' },
      { type: 'warning-started', restAt: 1 },
      { type: 'rest-started', kind: 'eye', endsAt: 2 },
      { type: 'away-ended', reset: true },
    ]);
    send([]);
    send();
    expect(record).not.toHaveBeenCalled();
  });

  it('records several outcomes of one update, each once', () => {
    const { send, record } = setup();
    send([
      { type: 'rest-completed', kind: 'eye' },
      { type: 'rest-postponed', newRestAt: 3 },
    ]);
    expect(record).toHaveBeenCalledTimes(2);
  });

  it('reads the clock per event, so a rest after midnight lands on the new day', () => {
    const { send, record, setNow } = setup(1);
    send([{ type: 'rest-completed', kind: 'eye' }]);
    setNow(90_000_000);
    send([{ type: 'rest-completed', kind: 'eye' }]);
    expect(record.mock.calls.map(([, at]) => at)).toEqual([1, 90_000_000]);
  });
});
