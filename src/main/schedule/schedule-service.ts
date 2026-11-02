import { sameSchedule, validateSchedule, type WorkSchedule } from '../../core/schedule';
import type { SaveScheduleResult } from '../../shared/ipc';
import type { SchedulePrefsPort } from './ports';

/**
 * Owns the working hours on the main side: answers reads, validates and stores writes, then tells
 * `onChange` so the gate re-checks at once instead of waiting for its next poll. Saving the current
 * value again writes nothing and notifies no one. The payload comes from a renderer, so it is
 * validated here whatever the form already checked.
 */
export class ScheduleService {
  constructor(
    private readonly prefs: SchedulePrefsPort,
    private readonly onChange: () => void,
  ) {}

  get(): WorkSchedule {
    return this.prefs.get();
  }

  save(payload: unknown): SaveScheduleResult {
    const checked = validateSchedule(payload);
    if (!checked.ok) return { ok: false, error: checked.error };

    if (!sameSchedule(checked.schedule, this.prefs.get())) {
      this.prefs.set(checked.schedule);
      this.onChange();
    }
    return { ok: true, schedule: checked.schedule };
  }
}
