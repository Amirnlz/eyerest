// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, type RestConfig } from '../../src/core/config';
import { SettingsForm } from '../../src/renderer/components/SettingsForm';
import { copy } from '../../src/renderer/copy';
import type { SaveSettingsResult } from '../../src/shared/ipc';

function setup(
  options: {
    initial?: RestConfig;
    onSave?: (settings: RestConfig) => Promise<SaveSettingsResult>;
  } = {},
) {
  const onSave = vi.fn<(settings: RestConfig) => Promise<SaveSettingsResult>>(
    options.onSave ?? ((settings) => Promise.resolve({ ok: true, settings })),
  );
  const user = userEvent.setup();
  render(<SettingsForm initial={options.initial ?? DEFAULT_CONFIG} onSave={onSave} />);
  const field = (label: string) => screen.getByRole('spinbutton', { name: label });
  const save = () => screen.getByRole('button', { name: copy.settings.actions.save });
  const replace = async (label: string, text: string) => {
    const input = field(label);
    await user.clear(input);
    if (text !== '') await user.type(input, text);
  };
  return { onSave, user, field, save, replace };
}

describe('SettingsForm rendering', () => {
  it('is a form named by its heading', () => {
    setup();
    expect(screen.getByRole('form', { name: copy.settings.title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: copy.settings.title })).toBeInTheDocument();
  });

  it('shows every setting with its label, current value and unit', () => {
    const { field } = setup();
    expect(field('Work interval')).toHaveValue(20);
    expect(field('Heads-up')).toHaveValue(15);
    expect(field('Eye rest')).toHaveValue(20);
    expect(field('Long rest')).toHaveValue(10);
    expect(field('Long rest every')).toHaveValue(3);
    expect(field('Postpone by')).toHaveValue(5);
    expect(field('Work interval')).toHaveAccessibleDescription(
      `minutes ${copy.settings.fields.workIntervalMs.hint}`,
    );
  });

  it('shows values saved earlier', () => {
    const { field } = setup({
      initial: { ...DEFAULT_CONFIG, workIntervalMs: 30 * 60_000, cyclesBeforeLongRest: 4 },
    });
    expect(field('Work interval')).toHaveValue(30);
    expect(field('Long rest every')).toHaveValue(4);
  });

  it('groups the fields into labelled sets', () => {
    setup();
    for (const name of Object.values(copy.settings.groups)) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
  });

  it('tells the person that saving restarts the timer', () => {
    setup();
    expect(screen.getByText(copy.settings.restartNote)).toBeInTheDocument();
  });

  it('starts with no error and an empty, always-mounted status region', () => {
    setup();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('SettingsForm saving', () => {
  it('saves the edited values converted to the stored units', async () => {
    const { onSave, user, replace, save } = setup();
    await replace('Work interval', '30');
    await replace('Eye rest', '45');
    await replace('Long rest every', '4');

    await user.click(save());

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      ...DEFAULT_CONFIG,
      workIntervalMs: 30 * 60_000,
      eyeRestMs: 45_000,
      cyclesBeforeLongRest: 4,
    });
  });

  it('announces success in the status region and clears it on the next edit', async () => {
    const { user, replace, save } = setup();
    await replace('Postpone by', '2');
    await user.click(save());

    expect(await screen.findByText(copy.settings.status.saved)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(copy.settings.status.saved);

    await replace('Postpone by', '3');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the stored form of the numbers after a save', async () => {
    const { user, field, replace, save } = setup();
    await replace('Work interval', '30.0');
    await user.click(save());
    await screen.findByText(copy.settings.status.saved);
    expect(field('Work interval')).toHaveDisplayValue('30');
  });

  it('submits with Enter from a field', async () => {
    const { onSave, user, field, replace } = setup();
    await replace('Postpone by', '2');
    field('Postpone by').focus();
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('keeps focus on the field while saving and does not save twice on a double submit', async () => {
    let resolve: (result: SaveSettingsResult) => void = () => undefined;
    const { onSave, user, field, replace } = setup({
      onSave: () =>
        new Promise<SaveSettingsResult>((done) => {
          resolve = done;
        }),
    });
    await replace('Postpone by', '2');
    field('Postpone by').focus();

    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(field('Postpone by')).toHaveFocus();
    expect(field('Postpone by')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: copy.settings.actions.saving })).toHaveAttribute(
      'aria-busy',
      'true',
    );

    await act(async () => {
      resolve({ ok: true, settings: { ...DEFAULT_CONFIG, postponeMs: 120_000 } });
    });
    await screen.findByText(copy.settings.status.saved);
    expect(field('Postpone by')).not.toHaveAttribute('readonly');
  });

  it('shows the message main gave when a save is rejected, as an alert, and keeps the edit', async () => {
    const { user, field, replace, save } = setup({
      onSave: () => Promise.resolve({ ok: false, error: 'Could not save settings. Try again.' }),
    });
    await replace('Postpone by', '2');

    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save settings. Try again.');
    expect(field('Postpone by')).toHaveValue(2);
  });

  it('treats a rejected promise as a failed save', async () => {
    const { user, replace, save } = setup({ onSave: () => Promise.reject(new Error('ipc down')) });
    await replace('Postpone by', '2');

    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.settings.status.saveFailed);
  });

  it('can retry after a failed save', async () => {
    const answers: SaveSettingsResult[] = [
      { ok: false, error: 'Could not save settings. Try again.' },
      { ok: true, settings: { ...DEFAULT_CONFIG, postponeMs: 120_000 } },
    ];
    const { onSave, user, replace, save } = setup({
      onSave: () => Promise.resolve(answers.shift() ?? { ok: false, error: 'unexpected' }),
    });
    await replace('Postpone by', '2');

    await user.click(save());
    await screen.findByRole('alert');
    await user.click(save());

    expect(await screen.findByText(copy.settings.status.saved)).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('SettingsForm validation', () => {
  it('does not scold a field while it is being typed', async () => {
    const { user, field } = setup();
    await user.clear(field('Eye rest'));
    expect(field('Eye rest')).not.toHaveAttribute('aria-invalid');
  });

  it('shows a field problem after the person leaves the field', async () => {
    const { user, field, replace } = setup();
    await replace('Eye rest', '');
    await user.tab();

    expect(field('Eye rest')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Eye rest')).toHaveAccessibleDescription(
      `seconds ${copy.settings.fields.eyeRestMs.hint} ${copy.settings.errors.required}`,
    );
  });

  it('clears the problem as soon as the value is fixed', async () => {
    const { user, field, replace } = setup();
    await replace('Eye rest', '0');
    await user.tab();
    expect(field('Eye rest')).toHaveAttribute('aria-invalid', 'true');

    await replace('Eye rest', '20');

    expect(field('Eye rest')).not.toHaveAttribute('aria-invalid');
  });

  it('refuses to save invalid values, focuses the first bad field and says why', async () => {
    const { onSave, user, field, replace, save } = setup();
    await replace('Long rest', '0');
    await replace('Eye rest', '');

    await user.click(save());

    expect(onSave).not.toHaveBeenCalled();
    expect(field('Eye rest')).toHaveFocus();
    expect(field('Eye rest')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Long rest')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(copy.settings.status.fixErrors);
  });

  it('puts the warning rule on the Heads-up field', async () => {
    const { user, field, replace, save } = setup();
    await replace('Work interval', '1');
    await replace('Heads-up', '60');

    await user.click(save());

    expect(field('Heads-up')).toHaveAccessibleDescription(
      expect.stringContaining(copy.settings.errors.warningTooLong),
    );
    expect(field('Heads-up')).toHaveFocus();
  });

  it('rejects a fractional rest count', async () => {
    const { onSave, user, replace, save, field } = setup();
    await replace('Long rest every', '2.5');
    await user.click(save());
    expect(onSave).not.toHaveBeenCalled();
    expect(field('Long rest every')).toHaveAccessibleDescription(
      expect.stringContaining(copy.settings.errors.wholeNumber),
    );
  });
});

describe('SettingsForm restore defaults', () => {
  it('puts the default values in the boxes without saving', async () => {
    const { onSave, user, field } = setup({
      initial: { ...DEFAULT_CONFIG, workIntervalMs: 30 * 60_000, postponeMs: 60_000 },
    });

    await user.click(screen.getByRole('button', { name: copy.settings.actions.restoreDefaults }));

    expect(field('Work interval')).toHaveValue(20);
    expect(field('Postpone by')).toHaveValue(5);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps the keyboard focus on the button after it is used', async () => {
    const { user } = setup();
    const restore = screen.getByRole('button', { name: copy.settings.actions.restoreDefaults });
    await user.click(restore);
    expect(restore).toHaveFocus();
    expect(restore).toBeEnabled();
  });

  it('can then be saved', async () => {
    const { onSave, user, save } = setup({
      initial: { ...DEFAULT_CONFIG, postponeMs: 60_000 },
    });
    await user.click(screen.getByRole('button', { name: copy.settings.actions.restoreDefaults }));
    await user.click(save());
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(DEFAULT_CONFIG));
  });
});

describe('SettingsForm keyboard', () => {
  it('reaches every field, then Restore defaults, then Save, in order with Tab', async () => {
    const { user } = setup();
    const order = [
      'Work interval',
      'Heads-up',
      'Eye rest',
      'Long rest',
      'Long rest every',
      'Postpone by',
    ];
    for (const name of order) {
      await user.tab();
      expect(screen.getByRole('spinbutton', { name })).toHaveFocus();
    }
    await user.tab();
    expect(screen.getByRole('button', { name: copy.settings.actions.restoreDefaults })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: copy.settings.actions.save })).toHaveFocus();
  });
});

describe('SettingsForm.css contract', () => {
  const css = readFileSync(
    join(__dirname, '../../src/renderer/components/SettingsForm.css'),
    'utf8',
  );

  it('lays the form out in a column with a bounded width', () => {
    expect(css).toMatch(/\.er-settings-form\s*\{[^}]*flex-direction:\s*column/);
    expect(css).toMatch(/\.er-settings-form\s*\{[^}]*max-inline-size:/);
  });

  it('resets the fieldset chrome so the legend and spacing come from tokens', () => {
    expect(css).toMatch(/__group\s*\{[^}]*border:\s*0/);
    expect(css).toMatch(/__group\s*\{[^}]*min-inline-size:\s*0/);
  });
});
