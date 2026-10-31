import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, createConfig, type RestConfig } from '../../../src/core/config';
import { SETTINGS_LIMITS } from '../../../src/core/settings-limits';
import { copy } from '../../../src/renderer/copy';
import {
  SETTINGS_FIELDS,
  SETTINGS_GROUPS,
  fieldRange,
  toFormValues,
  validateForm,
  type FormValues,
} from '../../../src/renderer/settings/form-model';

const defaults = toFormValues(DEFAULT_CONFIG);
const withValues = (override: Partial<FormValues>): FormValues => ({ ...defaults, ...override });
const withField = (key: keyof RestConfig, text: string): FormValues => ({
  ...defaults,
  [key]: text,
});
const outOfRange = (key: keyof RestConfig) => {
  const { min, max } = fieldRange(key);
  return copy.settings.errors.outOfRange(min, max);
};

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

describe('fieldRange', () => {
  it('gives whole numbers in the displayed unit, rounded inward', () => {
    expect(fieldRange('workIntervalMs')).toEqual({ min: 10, max: 40 });
    expect(fieldRange('warningMs')).toEqual({ min: 8, max: 30 });
    expect(fieldRange('eyeRestMs')).toEqual({ min: 10, max: 40 });
    expect(fieldRange('longRestMs')).toEqual({ min: 5, max: 20 });
    expect(fieldRange('cyclesBeforeLongRest')).toEqual({ min: 2, max: 6 });
    expect(fieldRange('postponeMs')).toEqual({ min: 3, max: 10 });
  });

  it('never reaches outside the limits main enforces', () => {
    for (const { key, msPerUnit } of SETTINGS_FIELDS) {
      const { min, max } = fieldRange(key);
      expect(min * msPerUnit).toBeGreaterThanOrEqual(SETTINGS_LIMITS[key].min);
      expect(max * msPerUnit).toBeLessThanOrEqual(SETTINGS_LIMITS[key].max);
    }
  });

  it('contains the default of every field', () => {
    for (const { key, msPerUnit } of SETTINGS_FIELDS) {
      const { min, max } = fieldRange(key);
      const shown = DEFAULT_CONFIG[key] / msPerUnit;
      expect(shown).toBeGreaterThanOrEqual(min);
      expect(shown).toBeLessThanOrEqual(max);
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

  it('shows a stored fraction as it is, without float noise', () => {
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
      withValues({
        workIntervalMs: '30',
        warningMs: '10',
        eyeRestMs: '35',
        longRestMs: '15',
        postponeMs: '4',
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      config: {
        workIntervalMs: 30 * 60_000,
        warningMs: 10_000,
        eyeRestMs: 35_000,
        longRestMs: 15 * 60_000,
        postponeMs: 4 * 60_000,
      },
    });
  });

  it('accepts surrounding spaces and leading zeros', () => {
    expect(validateForm(withValues({ workIntervalMs: ' 030 ' }))).toMatchObject({
      ok: true,
      config: { workIntervalMs: 30 * 60_000 },
    });
  });

  it.each(['', '   ', 'abc', '1.5', '-5', '+5', '1e2', '0x10', '２０'])(
    'asks for a number when the text is %j',
    (text) => {
      expect(validateForm(withValues({ eyeRestMs: text }))).toEqual({
        ok: false,
        errors: { eyeRestMs: copy.settings.errors.required },
      });
    },
  );

  it.each([
    ['workIntervalMs', '9', '41'],
    ['warningMs', '7', '31'],
    ['eyeRestMs', '9', '41'],
    ['longRestMs', '4', '21'],
    ['cyclesBeforeLongRest', '1', '7'],
    ['postponeMs', '2', '11'],
  ] as const)('%s rejects %s and %s, just outside its range', (key, below, above) => {
    for (const text of [below, above, '0']) {
      expect(validateForm(withField(key, text))).toEqual({
        ok: false,
        errors: { [key]: outOfRange(key) },
      });
    }
  });

  it.each([
    ['workIntervalMs', '10', '40'],
    ['warningMs', '8', '30'],
    ['eyeRestMs', '10', '40'],
    ['longRestMs', '5', '20'],
    ['cyclesBeforeLongRest', '2', '6'],
    ['postponeMs', '3', '10'],
  ] as const)('%s accepts both ends, %s and %s', (key, low, high) => {
    expect(validateForm(withField(key, low))).toMatchObject({ ok: true });
    expect(validateForm(withField(key, high))).toMatchObject({ ok: true });
  });

  it('rejects a number too large to store without overflow', () => {
    expect(validateForm(withValues({ workIntervalMs: '9'.repeat(400) }))).toEqual({
      ok: false,
      errors: { workIntervalMs: outOfRange('workIntervalMs') },
    });
  });

  it('reports every bad field at once', () => {
    const result = validateForm(
      withValues({ eyeRestMs: '', longRestMs: '0', cyclesBeforeLongRest: '99' }),
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        eyeRestMs: copy.settings.errors.required,
        longRestMs: outOfRange('longRestMs'),
        cyclesBeforeLongRest: outOfRange('cyclesBeforeLongRest'),
      },
    });
  });

  it('always produces a config that createConfig accepts (every low and high combination)', () => {
    const ends = SETTINGS_FIELDS.map(({ key }) => {
      const { min, max } = fieldRange(key);
      return { key, low: String(min), high: String(max) };
    });
    // 2^6 cases: each field at its low or its high end.
    for (let mask = 0; mask < 1 << ends.length; mask += 1) {
      const values: Record<keyof RestConfig, string> = { ...defaults };
      ends.forEach(({ key, low, high }, index) => {
        values[key] = ((mask >> index) & 1) === 0 ? low : high;
      });
      const result = validateForm(values);
      expect(result.ok, JSON.stringify(values)).toBe(true);
      if (result.ok) expect(() => createConfig(result.config)).not.toThrow();
    }
  });
});
