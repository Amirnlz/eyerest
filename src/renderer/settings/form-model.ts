import { createConfig, type RestConfig } from '../../core/config';
import { SETTINGS_LIMITS } from '../../core/settings-limits';
import { copy } from '../copy';

export type SettingsFieldKey = keyof RestConfig;

interface FieldSpec {
  readonly key: SettingsFieldKey;
  /** Milliseconds in one displayed unit. The cycle count is stored as is, so 1. */
  readonly msPerUnit: number;
}

const MINUTE = 60_000;
const SECOND = 1_000;

/** Display order. Units and copy come from here and `copy.settings.fields`. */
export const SETTINGS_FIELDS: readonly FieldSpec[] = [
  { key: 'workIntervalMs', msPerUnit: MINUTE },
  { key: 'warningMs', msPerUnit: SECOND },
  { key: 'eyeRestMs', msPerUnit: SECOND },
  { key: 'longRestMs', msPerUnit: MINUTE },
  { key: 'cyclesBeforeLongRest', msPerUnit: 1 },
  { key: 'postponeMs', msPerUnit: MINUTE },
];

export const SETTINGS_GROUPS: readonly {
  readonly id: keyof typeof copy.settings.groups;
  readonly keys: readonly SettingsFieldKey[];
}[] = [
  { id: 'work', keys: ['workIntervalMs', 'warningMs'] },
  { id: 'rest', keys: ['eyeRestMs', 'longRestMs', 'cyclesBeforeLongRest'] },
  { id: 'postpone', keys: ['postponeMs'] },
];

/** What each box holds, as text in the displayed unit. */
export type FormValues = Readonly<Record<SettingsFieldKey, string>>;
export type FormErrors = Partial<Record<SettingsFieldKey, string>>;

export type FormValidation =
  | { readonly ok: true; readonly config: RestConfig }
  | { readonly ok: false; readonly errors: FormErrors };

/** Text for a stored value. Rounded so unit conversion never shows float noise. */
function formatValue(ms: number, msPerUnit: number): string {
  return String(Math.round((ms / msPerUnit) * 1e6) / 1e6);
}

export function toFormValues(config: RestConfig): FormValues {
  const entries = SETTINGS_FIELDS.map(
    (spec) => [spec.key, formatValue(config[spec.key], spec.msPerUnit)] as const,
  );
  // Every key of `RestConfig` has a spec (tested), so the entries cover `FormValues`.
  return Object.fromEntries(entries) as FormValues;
}

/** The whole numbers a person may type for a field, ends included, in the displayed unit. */
export function fieldRange(key: SettingsFieldKey): { readonly min: number; readonly max: number } {
  const spec = SETTINGS_FIELDS.find((candidate) => candidate.key === key);
  const unit = spec?.msPerUnit ?? 1;
  const limit = SETTINGS_LIMITS[key];
  // Whole numbers only, so a half-unit limit such as 7.5 seconds rounds inward to 8.
  return { min: Math.ceil(limit.min / unit), max: Math.floor(limit.max / unit) };
}

/**
 * Turns the typed text into a `RestConfig`, or into one message per bad field. Pure.
 * A field holds digits only and must lie inside its range (`SETTINGS_LIMITS`, rounded inward to
 * whole units). Main checks the same limits again. The result is built by `createConfig`, which
 * cannot fail here: the largest warning (30 s) is always shorter than the smallest work interval.
 */
export function validateForm(values: FormValues): FormValidation {
  const errors: FormErrors = {};
  const parsed: Partial<Record<SettingsFieldKey, number>> = {};

  for (const { key, msPerUnit } of SETTINGS_FIELDS) {
    const text = values[key].trim();
    if (!/^\d+$/.test(text)) {
      errors[key] = copy.settings.errors.required;
      continue;
    }
    const entered = Number(text);
    const { min, max } = fieldRange(key);
    if (entered < min || entered > max) {
      errors[key] = copy.settings.errors.outOfRange(min, max);
      continue;
    }
    parsed[key] = entered * msPerUnit;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, config: createConfig(parsed) };
}
