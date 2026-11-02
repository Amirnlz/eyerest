// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE, type WorkSchedule } from '../../src/core/schedule';
import { ScheduleForm } from '../../src/renderer/components/ScheduleForm';
import { copy } from '../../src/renderer/copy';
import type { SaveScheduleResult } from '../../src/shared/ipc';

type Save = (schedule: WorkSchedule) => Promise<SaveScheduleResult>;

function setup(initial: WorkSchedule = DEFAULT_SCHEDULE, save?: Save) {
  const onSave = vi.fn<Save>(save ?? ((schedule) => Promise.resolve({ ok: true, schedule })));
  render(<ScheduleForm initial={initial} onSave={onSave} />);
  return { onSave, user: userEvent.setup() };
}

const enable = () => screen.getByRole('checkbox', { name: copy.schedule.enable });
const day = (name: string) => screen.getByRole('checkbox', { name });
const start = () => screen.getByLabelText(copy.schedule.start);
const end = () => screen.getByLabelText(copy.schedule.end);
const saveButton = () => screen.getByRole('button', { name: copy.schedule.actions.save });

describe('ScheduleForm rendering', () => {
  it('is a form named by its heading', () => {
    setup();
    expect(screen.getByRole('form', { name: copy.schedule.title })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: copy.schedule.title }),
    ).toBeInTheDocument();
  });

  it('shows the stored schedule: off, weekdays, 09:00 to 17:00', () => {
    setup();
    expect(enable()).not.toBeChecked();
    for (const name of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      expect(day(name)).toBeChecked();
    }
    expect(day('Saturday')).not.toBeChecked();
    expect(day('Sunday')).not.toBeChecked();
    expect(start()).toHaveValue('09:00');
    expect(end()).toHaveValue('17:00');
  });

  it('lists the days Monday first, inside a labelled group', () => {
    setup();
    const group = screen.getByRole('group', { name: copy.schedule.daysLegend });
    const names = Array.from(group.querySelectorAll('input')).map(
      (input) => input.closest('label')?.textContent,
    );
    expect(names).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
  });

  it('shows an end of the day as 00:00 and explains it', () => {
    setup({ ...DEFAULT_SCHEDULE, endMinute: 1440 });
    expect(end()).toHaveValue('00:00');
    expect(end()).toHaveAccessibleDescription(copy.schedule.endHint);
  });

  it('has an always-present, empty status region and no alert at first', () => {
    setup();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows no problem before the first save attempt, even for an invalid state', async () => {
    const { user } = setup();
    for (const name of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      await user.click(day(name));
    }
    expect(screen.queryByText(copy.schedule.errors.noDays)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('ScheduleForm saving', () => {
  it('saves the edited schedule with the exact shape main expects', async () => {
    const { onSave, user } = setup();

    await user.click(enable());
    await user.click(day('Saturday'));
    await user.click(day('Monday'));
    fireEvent.change(start(), { target: { value: '08:30' } });
    fireEvent.change(end(), { target: { value: '18:15' } });
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      enabled: true,
      days: expect.arrayContaining([2, 3, 4, 5, 6]) as number[],
      startMinute: 510,
      endMinute: 1095,
    });
    expect(onSave.mock.calls[0]?.[0].days).toHaveLength(5);
    expect(onSave.mock.calls[0]?.[0].days).not.toContain(1);
  });

  it('sends an end of 00:00 as the end of the day', async () => {
    const { onSave, user } = setup();
    fireEvent.change(end(), { target: { value: '00:00' } });
    await user.click(saveButton());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ endMinute: 1440 }));
  });

  it('confirms in the live region and clears the confirmation on the next edit', async () => {
    const { user } = setup();
    await user.click(enable());
    await user.click(saveButton());

    expect(await screen.findByText(copy.schedule.status.saved)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(copy.schedule.status.saved);

    await user.click(day('Sunday'));
    expect(screen.queryByText(copy.schedule.status.saved)).toBeNull();
  });

  it('shows what main stored, for example the days sorted', async () => {
    const stored: WorkSchedule = { enabled: true, days: [1], startMinute: 600, endMinute: 660 };
    const { user } = setup(DEFAULT_SCHEDULE, () => Promise.resolve({ ok: true, schedule: stored }));
    await user.click(saveButton());
    await screen.findByText(copy.schedule.status.saved);
    expect(start()).toHaveValue('10:00');
    expect(end()).toHaveValue('11:00');
    expect(day('Tuesday')).not.toBeChecked();
    expect(day('Monday')).toBeChecked();
  });

  it('shows the message main gives when it rejects the save', async () => {
    const { user } = setup(DEFAULT_SCHEDULE, () =>
      Promise.resolve({ ok: false, error: 'No way.' }),
    );
    await user.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('No way.');
    expect(screen.queryByText(copy.schedule.status.saved)).toBeNull();
  });

  it('shows a generic message when the save call itself rejects', async () => {
    const { user } = setup(DEFAULT_SCHEDULE, () => Promise.reject(new Error('ipc down')));
    await user.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.schedule.status.saveFailed);
  });

  it('ignores a second submit while a save is pending, and keeps the button focusable', async () => {
    let finish: (result: SaveScheduleResult) => void = () => undefined;
    const { onSave, user } = setup(
      DEFAULT_SCHEDULE,
      () =>
        new Promise<SaveScheduleResult>((resolve) => {
          finish = resolve;
        }),
    );

    await user.click(saveButton());
    const busy = screen.getByRole('button', { name: copy.schedule.actions.saving });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).not.toBeDisabled();
    await user.click(busy);
    expect(onSave).toHaveBeenCalledTimes(1);

    finish({ ok: true, schedule: DEFAULT_SCHEDULE });
    expect(await screen.findByText(copy.schedule.status.saved)).toBeInTheDocument();
  });
});

describe('ScheduleForm validation', () => {
  it('refuses to save with no day chosen, and says so on the group', async () => {
    const { onSave, user } = setup();
    for (const name of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      await user.click(day(name));
    }
    await user.click(saveButton());

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(copy.schedule.status.fixErrors);
    expect(screen.getByRole('group', { name: copy.schedule.daysLegend })).toHaveAccessibleDescription(
      copy.schedule.errors.noDays,
    );
  });

  it('refuses an end that is not after the start, and marks the end invalid', async () => {
    const { onSave, user } = setup();
    fireEvent.change(end(), { target: { value: '08:00' } });
    await user.click(saveButton());

    expect(onSave).not.toHaveBeenCalled();
    expect(end()).toHaveAttribute('aria-invalid', 'true');
    expect(end()).toHaveAccessibleDescription(
      `${copy.schedule.endHint} ${copy.schedule.errors.endBeforeStart}`,
    );
    expect(start()).not.toHaveAttribute('aria-invalid');
  });

  it('refuses an empty time, which a cleared time input reports as an empty value', async () => {
    const { onSave, user } = setup();
    fireEvent.change(start(), { target: { value: '' } });
    await user.click(saveButton());

    expect(onSave).not.toHaveBeenCalled();
    expect(start()).toHaveAttribute('aria-invalid', 'true');
    expect(start()).toHaveAccessibleDescription(copy.schedule.errors.badTime);
  });

  it('clears a problem once it is fixed, and then saves', async () => {
    const { onSave, user } = setup();
    fireEvent.change(end(), { target: { value: '08:00' } });
    await user.click(saveButton());
    expect(end()).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(end(), { target: { value: '18:00' } });
    expect(end()).not.toHaveAttribute('aria-invalid');

    await user.click(saveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe('ScheduleForm keyboard', () => {
  it('toggles the switch and a day with the space key', async () => {
    const { user } = setup();
    enable().focus();
    await user.keyboard(' ');
    expect(enable()).toBeChecked();

    day('Saturday').focus();
    await user.keyboard(' ');
    expect(day('Saturday')).toBeChecked();
  });

  it('reaches the switch, the days, both times and Save in reading order with Tab', async () => {
    const { user } = setup();
    await user.tab();
    expect(enable()).toHaveFocus();
    for (const name of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
      await user.tab();
      expect(day(name)).toHaveFocus();
    }
    // A time input has several focusable segments in browsers; jsdom has one stop each.
    await user.tab();
    expect(start()).toHaveFocus();
    await user.tab();
    expect(end()).toHaveFocus();
    await user.tab();
    expect(saveButton()).toHaveFocus();
  });

  it('submits from the keyboard with Enter on a checkbox', async () => {
    const { onSave, user } = setup();
    enable().focus();
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
