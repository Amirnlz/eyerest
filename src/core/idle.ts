import type { Phase } from './state';

/** Idle detection tuning. Separate from `RestConfig`: it is not a rest rule and has no settings UI yet. */
export interface IdleConfig {
  /** How long without input before the work countdown freezes. */
  readonly thresholdMs: number;
}

export const DEFAULT_IDLE_CONFIG: IdleConfig = Object.freeze({ thresholdMs: 60_000 });

export class IdleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdleConfigError';
  }
}

export function createIdleConfig(overrides: Partial<IdleConfig> = {}): IdleConfig {
  const config = { ...DEFAULT_IDLE_CONFIG, ...overrides };
  if (!Number.isFinite(config.thresholdMs) || config.thresholdMs <= 0) {
    throw new IdleConfigError('thresholdMs must be a positive number');
  }
  return Object.freeze(config);
}

export type IdleDecision = 'away' | 'back';

/**
 * Pure rule: what a fresh idle reading means for the current phase.
 * Only the work phase can go away; only the away phase can come back. A warning or a
 * rest in progress is never touched. A reading that is not a finite, non-negative
 * number is ignored, so a broken source can never freeze or reset the timer.
 */
export function decideIdle(input: {
  readonly phase: Phase;
  readonly idleMs: number;
  readonly thresholdMs: number;
}): IdleDecision | null {
  const { phase, idleMs, thresholdMs } = input;
  if (!Number.isFinite(idleMs) || idleMs < 0) return null;
  if (phase === 'working' && idleMs >= thresholdMs) return 'away';
  if (phase === 'away' && idleMs < thresholdMs) return 'back';
  return null;
}
