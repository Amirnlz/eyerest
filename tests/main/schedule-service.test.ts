import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE, type WorkSchedule } from '../../src/core/schedule';
import { ScheduleService } from '../../src/main/schedule/schedule-service';

const valid = { enabled: true, days: [3, 1], startMinute: 480, endMinute: 1020 };

function setup(initial: WorkSchedule = DEFAULT_SCHEDULE) {
  let current = initial;
  const prefs = {
    get: vi.fn(() => current),
    set: vi.fn((next: WorkSchedule) => {
      current = next;
    }),
  };
  const onChange = vi.fn();
  return { service: new ScheduleService(prefs, onChange), prefs, onChange };
}

describe('ScheduleService', () => {
  it('reads what the store holds', () => {
    expect(setup().service.get()).toBe(DEFAULT_SCHEDULE);
  });

  it('stores a valid payload normalized, notifies once, and returns what is stored', () => {
    const { service, prefs, onChange } = setup();

    const result = service.save(valid);

    expect(result).toEqual({
      ok: true,
      schedule: { enabled: true, days: [1, 3], startMinute: 480, endMinute: 1020 },
    });
    expect(prefs.set).toHaveBeenCalledTimes(1);
    expect(prefs.set).toHaveBeenCalledWith({ ...valid, days: [1, 3] });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(service.get()).toEqual({ ...valid, days: [1, 3] });
  });

  it('answers ok but writes and notifies nothing when the value did not change', () => {
    const { service, prefs, onChange } = setup();
    const result = service.save({ ...DEFAULT_SCHEDULE });
    expect(result.ok).toBe(true);
    expect(prefs.set).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('notifies after the store holds the new value, so the gate reads the saved schedule', () => {
    let seen: WorkSchedule | null = null;
    let current: WorkSchedule = DEFAULT_SCHEDULE;
    const service = new ScheduleService(
      {
        get: () => current,
        set: (next) => {
          current = next;
        },
      },
      () => {
        seen = current;
      },
    );
    service.save(valid);
    expect(seen).toEqual({ ...valid, days: [1, 3] });
  });

  it.each([
    ['null', null],
    ['an unknown field', { ...valid, extra: true }],
    ['no days', { ...valid, days: [] }],
    ['an end before the start', { ...valid, startMinute: 900, endMinute: 600 }],
    ['strings for numbers', { ...valid, startMinute: '480' }],
  ])('rejects %s without writing or notifying', (_name, payload) => {
    const { service, prefs, onChange } = setup();
    const result = service.save(payload);
    expect(result.ok).toBe(false);
    expect(prefs.set).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
