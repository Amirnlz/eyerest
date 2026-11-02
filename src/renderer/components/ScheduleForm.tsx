import { useId, useState, type FormEvent } from 'react';
import type { Weekday, WorkSchedule } from '../../core/schedule';
import type { SaveScheduleResult } from '../../shared/ipc';
import { copy } from '../copy';
import {
  DAY_DISPLAY_ORDER,
  toScheduleFormValues,
  validateScheduleForm,
  type ScheduleFormValues,
} from '../settings/schedule-model';
import { Button, Text } from '../ui';
import './ScheduleForm.css';

export interface ScheduleFormProps {
  /** What is saved now. The form edits a copy. */
  readonly initial: WorkSchedule;
  /** Persists the schedule. A rejection is shown as a failed save, never thrown into the tree. */
  readonly onSave: (schedule: WorkSchedule) => Promise<SaveScheduleResult>;
}

type Status =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved' }
  | { readonly kind: 'error'; readonly message: string };

const IDLE: Status = { kind: 'idle' };

/**
 * Edits the working hours: an on/off switch, the active days and a start and end time. It saves on
 * its own, apart from the rest settings, because the two live in different stores and a saved
 * schedule applies without restarting the work timer. Problems show after the first save attempt.
 * Native checkboxes and time inputs keep keyboard and screen reader behavior for free. Nothing
 * disables itself while saving (a disabled control drops focus); the submit handler ignores repeats.
 */
export function ScheduleForm({ initial, onSave }: ScheduleFormProps) {
  const titleId = useId();
  const daysErrorId = useId();
  const startErrorId = useId();
  const endErrorId = useId();
  const endHintId = useId();
  const [values, setValues] = useState<ScheduleFormValues>(() => toScheduleFormValues(initial));
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>(IDLE);

  const validation = validateScheduleForm(values);
  const errors = submitted && !validation.ok ? validation.errors : {};
  const saving = status.kind === 'saving';

  const edit = (patch: Partial<ScheduleFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setStatus(IDLE);
  };

  const toggleDay = (day: Weekday) => {
    const days = values.days.includes(day)
      ? values.days.filter((candidate) => candidate !== day)
      : [...values.days, day];
    edit({ days });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);

    const result = validateScheduleForm(values);
    if (!result.ok) {
      setStatus({ kind: 'error', message: copy.schedule.status.fixErrors });
      return;
    }

    setStatus({ kind: 'saving' });
    let answer: SaveScheduleResult;
    try {
      answer = await onSave(result.schedule);
    } catch {
      answer = { ok: false, error: copy.schedule.status.saveFailed };
    }

    if (answer.ok) {
      setValues(toScheduleFormValues(answer.schedule));
      setStatus({ kind: 'saved' });
    } else {
      setStatus({ kind: 'error', message: answer.error });
    }
  };

  return (
    <form
      className="er-schedule-form"
      aria-labelledby={titleId}
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      <Text as="h2" variant="title" id={titleId}>
        {copy.schedule.title}
      </Text>
      <Text variant="body" tone="secondary">
        {copy.schedule.note}
      </Text>

      <label className="er-schedule-form__check">
        <input
          type="checkbox"
          checked={values.enabled}
          onChange={(event) => edit({ enabled: event.target.checked })}
        />
        <Text as="span" variant="body">
          {copy.schedule.enable}
        </Text>
      </label>

      <fieldset
        className="er-schedule-form__group"
        aria-describedby={errors.days === undefined ? undefined : daysErrorId}
      >
        <Text as="legend" variant="label" tone="secondary">
          {copy.schedule.daysLegend}
        </Text>
        <div className="er-schedule-form__days">
          {DAY_DISPLAY_ORDER.map((day) => (
            <label className="er-schedule-form__check" key={day}>
              <input
                type="checkbox"
                checked={values.days.includes(day)}
                onChange={() => toggleDay(day)}
              />
              <Text as="span" variant="body">
                {copy.schedule.days[day]}
              </Text>
            </label>
          ))}
        </div>
        {errors.days === undefined ? null : (
          <Text as="p" variant="caption" id={daysErrorId}>
            {errors.days}
          </Text>
        )}
      </fieldset>

      <div className="er-schedule-form__times">
        <div className="er-schedule-form__time">
          <Text as="label" variant="label" htmlFor={`${titleId}-start`}>
            {copy.schedule.start}
          </Text>
          <input
            id={`${titleId}-start`}
            className="er-schedule-form__input"
            type="time"
            value={values.start}
            readOnly={saving}
            aria-invalid={errors.start === undefined ? undefined : true}
            aria-describedby={errors.start === undefined ? undefined : startErrorId}
            onChange={(event) => edit({ start: event.target.value })}
          />
          {errors.start === undefined ? null : (
            <Text as="p" variant="caption" id={startErrorId}>
              {errors.start}
            </Text>
          )}
        </div>
        <div className="er-schedule-form__time">
          <Text as="label" variant="label" htmlFor={`${titleId}-end`}>
            {copy.schedule.end}
          </Text>
          <input
            id={`${titleId}-end`}
            className="er-schedule-form__input"
            type="time"
            value={values.end}
            readOnly={saving}
            aria-invalid={errors.end === undefined ? undefined : true}
            aria-describedby={
              errors.end === undefined ? endHintId : `${endHintId} ${endErrorId}`
            }
            onChange={(event) => edit({ end: event.target.value })}
          />
          <Text as="p" variant="caption" tone="secondary" id={endHintId}>
            {copy.schedule.endHint}
          </Text>
          {errors.end === undefined ? null : (
            <Text as="p" variant="caption" id={endErrorId}>
              {errors.end}
            </Text>
          )}
        </div>
      </div>

      <div className="er-schedule-form__actions">
        <Button type="submit" variant="primary" aria-busy={saving || undefined}>
          {saving ? copy.schedule.actions.saving : copy.schedule.actions.save}
        </Button>
      </div>

      {/* A live region must exist before its text changes, so the status box is always mounted. */}
      <div className="er-schedule-form__status" role="status">
        {status.kind === 'saved' ? copy.schedule.status.saved : null}
      </div>
      {status.kind === 'error' ? (
        <div className="er-schedule-form__status" role="alert">
          {status.message}
        </div>
      ) : null}
    </form>
  );
}
