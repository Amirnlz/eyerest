import { DEFAULT_CONFIG, createConfig, type RestConfig } from '../../core/config';
import { copy } from '../copy';

export type SettingsFieldKey = keyof RestConfig;

interface FieldSpec {
  readonly key: SettingsFieldKey;
  /** Milliseconds in one displayed unit. The cycle count is stored as is, so 1. */
  readonly msPerUnit: number;
  readonly wholeNumber: boolean;
}

const MINUTE = 60_000;
const SECOND = 1_000;

/** Display order. Units and copy come from here and `copy.settings.fields`. */
export const SETTINGS_FIELDS: readonly FieldSpec[] = [
  { key: 'workIntervalMs', msPerUnit: MINUTE, wholeNumber: false },
  { key: 'warningMs', msPerUnit: SECOND, wholeNumber: false },
  { key: 'eyeRestMs', msPerUnit: SECOND, wholeNumber: false },
  { key: 'longRestMs', msPerUnit: MINUTE, wholeNumber: false },
  { key: 'cyclesBeforeLongRest', msPerUnit: 1, wholeNumber: true },
  { key: 'postponeMs', msPerUnit: MINUTE, wholeNumber: false },
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

/**
 * Turns the typed text into a `RestConfig`, or into one message per bad field. Pure.
 * The rules mirror `createConfig` so errors land on the field that caused them (a test checks the
 * two agree); the result is still built by `createConfig`, and main validates again.
 */
export function validateForm(values: FormValues): FormValidation {
  const errors: FormErrors = {};
  const parsed: Partial<Record<SettingsFieldKey, number>> = {};

  for (const { key, msPerUnit, wholeNumber } of SETTINGS_FIELDS) {
    const text = values[key].trim();
    if (text === '') {
      errors[key] = copy.settings.errors.required;
      continue;
    }
    const entered = Number(text);
    if (!Number.isFinite(entered)) {
      errors[key] = copy.settings.errors.required;
      continue;
    }
    const stored = Math.round(entered * msPerUnit);
    if (!Number.isSafeInteger(stored)) {
      errors[key] = copy.settings.errors.tooLarge;
      continue;
    }
    if (wholeNumber) {
      if (!Number.isInteger(entered) || entered < 1) {
        errors[key] = copy.settings.errors.wholeNumber;
        continue;
      }
    } else if (stored <= 0) {
      errors[key] = copy.settings.errors.positive;
      continue;
    }
    parsed[key] = stored;
  }

  const { workIntervalMs, warningMs } = parsed;
  if (workIntervalMs !== undefined && warningMs !== undefined && warningMs >= workIntervalMs) {
    errors.warningMs = copy.settings.errors.warningTooLong;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, config: createConfig(parsed) };
}
