import { vi, type Mock } from 'vitest';
import type { Snapshot } from '../../src/core/scheduler';
import type { EyerestApi } from '../../src/shared/ipc';

export interface FakeApi extends EyerestApi {
  /** Resolves the pending `getSnapshot()` promise. */
  resolveSnapshot(snapshot: Snapshot): void;
  /** Rejects the pending `getSnapshot()` promise. */
  rejectSnapshot(error: unknown): void;
  /** Simulates the main process pushing a snapshot. */
  push(snapshot: Snapshot): void;
  listenerCount(): number;
  skip: Mock<() => void>;
  postpone: Mock<() => void>;
}

export function createFakeApi(): FakeApi {
  const listeners = new Set<(snapshot: Snapshot) => void>();
  let resolveSnapshot!: (snapshot: Snapshot) => void;
  let rejectSnapshot!: (error: unknown) => void;
  const initial = new Promise<Snapshot>((resolve, reject) => {
    resolveSnapshot = resolve;
    rejectSnapshot = reject;
  });

  return {
    getSnapshot: () => initial,
    onSnapshot: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    skip: vi.fn<() => void>(),
    postpone: vi.fn<() => void>(),
    resolveSnapshot,
    rejectSnapshot,
    push: (snapshot) => {
      for (const listener of [...listeners]) listener(snapshot);
    },
    listenerCount: () => listeners.size,
  };
}

export const IDLE: Snapshot = { state: { phase: 'idle' }, secondsRemaining: null };

export const WORKING: Snapshot = {
  state: { phase: 'working', restAt: 20_000, restsDone: 0 },
  secondsRemaining: null,
};

export const warning = (seconds: number): Snapshot => ({
  state: { phase: 'warning', restAt: 20_000, restsDone: 0 },
  secondsRemaining: seconds,
});

export const resting = (seconds: number, kind: 'eye' | 'long' = 'eye'): Snapshot => ({
  state: { phase: 'resting', kind, endsAt: 25_000, restsDone: kind === 'long' ? 2 : 0 },
  secondsRemaining: seconds,
});
