/** All durations are in milliseconds. */
export interface RestConfig {
  /** Work time between rests. */
  readonly workIntervalMs: number;
  /** How long before a rest the heads-up notification appears. */
  readonly warningMs: number;
  /** Duration of a regular eye rest. */
  readonly eyeRestMs: number;
  /** Duration of the long rest offered after a group of eye rests. */
  readonly longRestMs: number;
  /** Every Nth rest is a long rest (3 => eye, eye, long, eye, eye, long, ...). */
  readonly cyclesBeforeLongRest: number;
  /** Delay applied when the user postpones a rest. */
  readonly postponeMs: number;
}

const MINUTE = 60_000;
const SECOND = 1_000;

export const DEFAULT_CONFIG: RestConfig = Object.freeze({
  workIntervalMs: 20 * MINUTE,
  warningMs: 15 * SECOND,
  eyeRestMs: 20 * SECOND,
  longRestMs: 10 * MINUTE,
  cyclesBeforeLongRest: 3,
  postponeMs: 5 * MINUTE,
});

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Merges overrides onto defaults and validates the result.
 * Throws ConfigError on invalid values so bad settings never reach the engine.
 */
export function createConfig(overrides: Partial<RestConfig> = {}): RestConfig {
  const config: RestConfig = { ...DEFAULT_CONFIG, ...overrides };

  const positiveMsFields = [
    'workIntervalMs',
    'warningMs',
    'eyeRestMs',
    'longRestMs',
    'postponeMs',
  ] as const;

  for (const field of positiveMsFields) {
    const value = config[field];
    if (!Number.isFinite(value) || value <= 0) {
      throw new ConfigError(`${field} must be a positive number of milliseconds`);
    }
  }

  if (!Number.isInteger(config.cyclesBeforeLongRest) || config.cyclesBeforeLongRest < 1) {
    throw new ConfigError('cyclesBeforeLongRest must be an integer >= 1');
  }

  if (config.warningMs >= config.workIntervalMs) {
    throw new ConfigError('warningMs must be shorter than workIntervalMs');
  }

  return Object.freeze(config);
}
