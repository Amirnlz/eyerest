import { useId, useRef, useState, type FormEvent } from 'react';
import { DEFAULT_CONFIG, type RestConfig } from '../../core/config';
import type { SaveSettingsResult } from '../../shared/ipc';
import { copy } from '../copy';
import {
  SETTINGS_FIELDS,
  SETTINGS_GROUPS,
  fieldRange,
  toFormValues,
  validateForm,
  type FormValues,
  type SettingsFieldKey,
} from '../settings/form-model';
import { Button, NumberField, Text } from '../ui';
import './SettingsForm.css';

export interface SettingsFormProps {
  /** What is saved now. The form edits a copy. */
  readonly initial: RestConfig;
  /** Persists the settings. A rejection is shown as a failed save, never thrown into the tree. */
  readonly onSave: (settings: RestConfig) => Promise<SaveSettingsResult>;
  /** Closes the window. Unsaved edits are dropped, as with any Close. */
  readonly onClose: () => void;
}

type Status =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved' }
  | { readonly kind: 'error'; readonly message: string };

const IDLE: Status = { kind: 'idle' };

/**
 * Edits the six rest settings. Shows a field's problem after the person leaves it or tries to
 * save, so typing is never scolded halfway through a number. Saving is validated here for
 * a clear message and again in main for safety.
 *
 * No control is disabled while saving or when nothing changed: a control that disables itself
 * drops keyboard focus. Fields go read-only while saving and the submit handler ignores repeats.
 */
export function SettingsForm({ initial, onSave, onClose }: SettingsFormProps) {
  const titleId = useId();
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial));
  const [touched, setTouched] = useState<ReadonlySet<SettingsFieldKey>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>(IDLE);
  const inputs = useRef<Partial<Record<SettingsFieldKey, HTMLInputElement | null>>>({});

  const validation = validateForm(values);
  const errors = validation.ok ? {} : validation.errors;
  const saving = status.kind === 'saving';

  const edit = (key: SettingsFieldKey, text: string) => {
    setValues((current) => ({ ...current, [key]: text }));
    setStatus(IDLE);
  };

  const touch = (key: SettingsFieldKey) => {
    setTouched((current) => (current.has(key) ? current : new Set(current).add(key)));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);

    const result = validateForm(values);
    if (!result.ok) {
      const first = SETTINGS_FIELDS.find(({ key }) => result.errors[key] !== undefined);
      if (first !== undefined) inputs.current[first.key]?.focus();
      setStatus({ kind: 'error', message: copy.settings.status.fixErrors });
      return;
    }

    setStatus({ kind: 'saving' });
    let answer: SaveSettingsResult;
    try {
      answer = await onSave(result.config);
    } catch {
      answer = { ok: false, error: copy.settings.status.saveFailed };
    }

    if (answer.ok) {
      // Show the stored form of the numbers ("20.0" becomes "20").
      setValues(toFormValues(answer.settings));
      setStatus({ kind: 'saved' });
    } else {
      setStatus({ kind: 'error', message: answer.error });
    }
  };

  return (
    <form
      className="er-settings-form"
      aria-labelledby={titleId}
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      <Text as="h1" variant="title" id={titleId}>
        {copy.settings.title}
      </Text>
      <Text variant="body" tone="secondary">
        {copy.settings.restartNote}
      </Text>

      {SETTINGS_GROUPS.map((group) => (
        <fieldset className="er-settings-form__group" key={group.id}>
          <Text as="legend" variant="label" tone="secondary">
            {copy.settings.groups[group.id]}
          </Text>
          {group.keys.map((key) => {
            const text = copy.settings.fields[key];
            const visible = submitted || touched.has(key);
            const { min, max } = fieldRange(key);
            return (
              <NumberField
                key={key}
                ref={(element) => {
                  inputs.current[key] = element;
                }}
                label={text.label}
                hint={text.hint}
                unit={copy.settings.range(min, max, text.unit)}
                maxLength={String(max).length}
                value={values[key]}
                error={visible ? errors[key] : undefined}
                readOnly={saving}
                onValueChange={(next) => edit(key, next)}
                onBlur={() => touch(key)}
              />
            );
          })}
        </fieldset>
      ))}

      <div className="er-settings-form__actions">
        <Button
          variant="quiet"
          onClick={() => {
            if (saving) return;
            setValues(toFormValues(DEFAULT_CONFIG));
            setStatus(IDLE);
          }}
        >
          {copy.settings.actions.restoreDefaults}
        </Button>
        <Button variant="quiet" onClick={onClose}>
          {copy.settings.actions.close}
        </Button>
        <Button type="submit" variant="primary" aria-busy={saving || undefined}>
          {saving ? copy.settings.actions.saving : copy.settings.actions.save}
        </Button>
      </div>

      {/* A live region must exist before its text changes, so the status box is always mounted. */}
      <div className="er-settings-form__status" role="status">
        {status.kind === 'saved' ? copy.settings.status.saved : null}
      </div>
      {status.kind === 'error' ? (
        <div className="er-settings-form__status" role="alert">
          {status.message}
        </div>
      ) : null}
    </form>
  );
}
