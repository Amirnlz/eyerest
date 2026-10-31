import { describe, expect, it } from 'vitest';
import { ConfigError, DEFAULT_CONFIG, createConfig, type RestConfig } from '../../../src/core/config';
import { copy } from '../../../src/renderer/copy';
import {
  SETTINGS_FIELDS,
  SETTINGS_GROUPS,
  toFormValues,
  validateForm,
  type FormValues,
} from '../../../src/renderer/settings/form-model';

const defaults = toFormValues(DEFAULT_CONFIG);
const withValues = (override: Partial<FormValues>): FormValues => ({ ...defaults, ...override });

describe('SETTINGS_FIELDS and SETTINGS_GROUPS', () => {
  it('cover every RestConfig key exactly once', () => {
    const keys = Object.keys(DEFAULT_CONFIG).sort();
    expect(SETTINGS_FIELDS.map((field) => field.key).sort()).toEqual(keys);
    expect(SETTINGS_GROUPS.flatMap((group) => group.keys).sort()).toEqual(keys);
  });

  it('have copy for every field and group', () => {
    for (const { key } of SETTINGS_FIELDS) {
      expect(copy.settings.fields[key].label.trim()).not.toBe('');
    }
    for (const { id } of SETTINGS_GROUPS) {
      expect(copy.settings.groups[id].trim()).not.toBe('');
    }
  });
});

describe('toFormValues', () => {
  it('shows the spec defaults in minutes, seconds and counts', () => {
    expect(defaults).toEqual({
      workIntervalMs: '20',
      warningMs: '15',
      eyeRestMs: '20',
      longRestMs: '10',
      cyclesBeforeLongRest: '3',
      postponeMs: '5',
    });
  });

  it('shows fractions without float noise', () => {
    const values = toFormValues({ ...DEFAULT_CONFIG, workIntervalMs: 90_000, postponeMs: 100_000 });
    expect(values.workIntervalMs).toBe('1.5');
    expect(values.postponeMs).toBe('1.666667');
  });
});

describe('validateForm', () => {
  it('turns the defaults back into the default config', () => {
    expect(validateForm(defaults)).toEqual({ ok: true, config: DEFAULT_CONFIG });
  });

  it('converts minutes and seconds to milliseconds', () => {
    const result = validateForm(
      withValues({ workIntervalMs: '30', warningMs: '10', eyeRestMs: '45', longRestMs: '15', postponeMs: '2' }),
    );
    expect(result).toMatchObject({
      ok: true,
      config: {
        workIntervalMs: 30 * 60_000,
        warningMs: 10_000,
        eyeRestMs: 45_000,
        longRestMs: 15 * 60_000,
        postponeMs: 2 * 60_000,
      },
    });
  });

  it('accepts decimals and surrounding spaces', () => {
    const result = validateForm(withValues({ workIntervalMs: ' 1.5 ' }));
    expect(result).toMatchObject({ ok: true, config: { workIntervalMs: 90_000 } });
  });

  it.each(['', '   ', 'abc', '1e999'])('asks for a number when the text is %j', (text) => {
    expect(validateForm(withValues({ eyeRestMs: text }))).toEqual({
      ok: false,
      errors: { eyeRestMs: copy.settings.errors.required },
    });
  });

  it.each(['0', '-1', '-0.5'])('rejects %s minutes as not above zero', (text) => {
    expect(validateForm(withValues({ postponeMs: text }))).toEqual({
      ok: false,
      errors: { postponeMs: copy.settings.errors.positive },
    });
  });

  it.each(['0', '-2', '2.5', '1.01'])('rejects %s rests as not a whole number of 1 or more', (text) => {
    expect(validateForm(withValues({ cyclesBeforeLongRest: text }))).toEqual({
      ok: false,
      errors: { cyclesBeforeLongRest: copy.settings.errors.wholeNumber },
    });
  });

  it('accepts one rest per cycle (boundary)', () => {
    expect(validateForm(withValues({ cyclesBeforeLongRest: '1' }))).toMatchObject({ ok: true });
  });

  it('rejects a value too large to store', () => {
    expect(validateForm(withValues({ workIntervalMs: '1e300' }))).toEqual({
      ok: false,
      errors: { workIntervalMs: copy.settings.errors.tooLarge },
    });
  });

  it('puts the warning error on the warning field when it is not shorter than the work interval', () => {
    expect(validateForm(withValues({ workIntervalMs: '1', warningMs: '60' }))).toEqual({
      ok: false,
      errors: { warningMs: copy.settings.errors.warningTooLong },
    });
  });

  it('accepts a warning one second shorter than the work interval (boundary)', () => {
    expect(validateForm(withValues({ workIntervalMs: '1', warningMs: '59' }))).toMatchObject({ ok: true });
  });

  it('reports every bad field at once', () => {
    const result = validateForm(withValues({ eyeRestMs: '', longRestMs: '0', cyclesBeforeLongRest: '1.5' }));
    expect(result).toEqual({
      ok: false,
      errors: {
        eyeRestMs: copy.settings.errors.required,
        longRestMs: copy.settings.errors.positive,
        cyclesBeforeLongRest: copy.settings.errors.wholeNumber,
      },
    });
  });

  it('does not report the warning rule while a field it depends on is itself invalid', () => {
    const result = validateForm(withValues({ workIntervalMs: '', warningMs: '60' }));
    expect(result).toEqual({
      ok: false,
      errors: { workIntervalMs: copy.settings.errors.required },
    });
  });

  it('agrees with createConfig: every outcome of a grid of inputs matches', () => {
    const samples = ['0', '1', '3', '15', '20', '60', '-1', '2.5'];
    const keys = SETTINGS_FIELDS.map((field) => field.key);
    // Vary two fields at a time around the defaults; the rest stay valid.
    for (const a of keys) {
      for (const b of keys) {
        for (const x of samples) {
          for (const y of samples) {
            const values = { ...defaults, [a]: x, [b]: y };
            const result = validateForm(values);
            expect(result.ok, JSON.stringify(values)).toBe(acceptedByCore(values));
          }
        }
      }
    }
  });
});

/** The same text, converted the way the form does, judged by `createConfig` alone. */
function acceptedByCore(values: FormValues): boolean {
  const config: Partial<Record<keyof RestConfig, number>> = {};
  for (const { key, msPerUnit, wholeNumber } of SETTINGS_FIELDS) {
    const text = values[key].trim();
    if (text === '' || !Number.isFinite(Number(text))) return false;
    // A count is not converted, so core sees 2.5 as 2.5 and rejects it.
    config[key] = wholeNumber ? Number(text) : Math.round(Number(text) * msPerUnit);
  }
  try {
    createConfig(config);
    return true;
  } catch (error) {
    if (error instanceof ConfigError) return false;
    throw error;
  }
}
