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
  const onClose = vi.fn<() => void>();
  const user = userEvent.setup();
  render(<SettingsForm initial={options.initial ?? DEFAULT_CONFIG} onSave={onSave} onClose={onClose} />);
  const field = (label: string) => screen.getByRole('textbox', { name: label });
  const save = () => screen.getByRole('button', { name: copy.settings.actions.save });
  const replace = async (label: string, text: string) => {
    const input = field(label);
    await user.clear(input);
    if (text !== '') await user.type(input, text);
  };
  return { onSave, onClose, user, field, save, replace };
}

describe('SettingsForm rendering', () => {
  it('is a form named by its heading', () => {
    setup();
    expect(screen.getByRole('form', { name: copy.settings.title })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: copy.settings.title })).toBeInTheDocument();
  });

  it('shows every setting with its label and current value', () => {
    const { field } = setup();
    expect(field('Work interval')).toHaveValue('20');
    expect(field('Heads-up')).toHaveValue('15');
    expect(field('Eye rest')).toHaveValue('20');
    expect(field('Long rest')).toHaveValue('10');
    expect(field('Long rest every')).toHaveValue('3');
    expect(field('Postpone by')).toHaveValue('5');
  });

  it('shows the allowed range with the unit, then the hint, as the description', () => {
    const { field } = setup();
    expect(field('Work interval')).toHaveAccessibleDescription(
      `10 to 40 minutes ${copy.settings.fields.workIntervalMs.hint}`,
    );
    expect(field('Heads-up')).toHaveAccessibleDescription(
      `8 to 30 seconds ${copy.settings.fields.warningMs.hint}`,
    );
    expect(field('Long rest every')).toHaveAccessibleDescription(
      `2 to 6 rests ${copy.settings.fields.cyclesBeforeLongRest.hint}`,
    );
  });

  it('has no spin buttons: every setting is a plain text box', () => {
    setup();
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('limits how many digits can be typed to the digits of the largest allowed number', () => {
    const { field } = setup();
    expect(field('Work interval')).toHaveAttribute('maxlength', '2');
    expect(field('Long rest every')).toHaveAttribute('maxlength', '1');
  });

  it('shows values saved earlier', () => {
    const { field } = setup({
      initial: { ...DEFAULT_CONFIG, workIntervalMs: 30 * 60_000, cyclesBeforeLongRest: 4 },
    });
    expect(field('Work interval')).toHaveValue('30');
    expect(field('Long rest every')).toHaveValue('4');
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

describe('SettingsForm typing', () => {
  it('takes only digits: letters, signs and dots never reach the box', async () => {
    const { field, replace } = setup();
    await replace('Work interval', '');
    await replace('Eye rest', 'a2-b.5e');
    expect(field('Work interval')).toHaveValue('');
    expect(field('Eye rest')).toHaveValue('25');
  });

  it('keeps only the digits of pasted text', async () => {
    const { user, field } = setup();
    await user.clear(field('Postpone by'));
    await user.paste('7 minutes');
    expect(field('Postpone by')).toHaveValue('7');
  });
});

describe('SettingsForm saving', () => {
  it('saves the edited values converted to the stored units', async () => {
    const { onSave, user, replace, save } = setup();
    await replace('Work interval', '30');
    await replace('Eye rest', '35');
    await replace('Long rest every', '4');

    await user.click(save());

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      ...DEFAULT_CONFIG,
      workIntervalMs: 30 * 60_000,
      eyeRestMs: 35_000,
      cyclesBeforeLongRest: 4,
    });
  });

  it('announces success in the status region and clears it on the next edit', async () => {
    const { user, replace, save } = setup();
    await replace('Postpone by', '3');
    await user.click(save());

    expect(await screen.findByText(copy.settings.status.saved)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(copy.settings.status.saved);

    await replace('Postpone by', '4');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the stored form of the numbers after a save', async () => {
    const { user, field, replace, save } = setup();
    await replace('Work interval', '030');
    await user.click(save());
    await screen.findByText(copy.settings.status.saved);
    expect(field('Work interval')).toHaveDisplayValue('30');
  });

  it('submits with Enter from a field', async () => {
    const { onSave, user, field, replace } = setup();
    await replace('Postpone by', '3');
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
    await replace('Postpone by', '3');
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
      resolve({ ok: true, settings: { ...DEFAULT_CONFIG, postponeMs: 180_000 } });
    });
    await screen.findByText(copy.settings.status.saved);
    expect(field('Postpone by')).not.toHaveAttribute('readonly');
  });

  it('shows the message main gave when a save is rejected, as an alert, and keeps the edit', async () => {
    const { user, field, replace, save } = setup({
      onSave: () => Promise.resolve({ ok: false, error: 'Could not save settings. Try again.' }),
    });
    await replace('Postpone by', '3');

    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save settings. Try again.');
    expect(field('Postpone by')).toHaveValue('3');
  });

  it('treats a rejected promise as a failed save', async () => {
    const { user, replace, save } = setup({ onSave: () => Promise.reject(new Error('ipc down')) });
    await replace('Postpone by', '3');

    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.settings.status.saveFailed);
  });

  it('can retry after a failed save', async () => {
    const answers: SaveSettingsResult[] = [
      { ok: false, error: 'Could not save settings. Try again.' },
      { ok: true, settings: { ...DEFAULT_CONFIG, postponeMs: 180_000 } },
    ];
    const { onSave, user, replace, save } = setup({
      onSave: () => Promise.resolve(answers.shift() ?? { ok: false, error: 'unexpected' }),
    });
    await replace('Postpone by', '3');

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

  it('shows a missing number after the person leaves the field', async () => {
    const { user, field, replace } = setup();
    await replace('Eye rest', '');
    await user.tab();

    expect(field('Eye rest')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Eye rest')).toHaveAccessibleDescription(
      `10 to 40 seconds ${copy.settings.fields.eyeRestMs.hint} ${copy.settings.errors.required}`,
    );
  });

  it('shows the range after the person leaves a field holding a number outside it', async () => {
    const { user, field, replace } = setup();
    await replace('Work interval', '41');
    await user.tab();

    expect(field('Work interval')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Work interval')).toHaveAccessibleDescription(
      expect.stringContaining(copy.settings.errors.outOfRange(10, 40)),
    );
  });

  it('clears the problem as soon as the value is fixed', async () => {
    const { user, field, replace } = setup();
    await replace('Eye rest', '5');
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

  it.each([
    ['Work interval', '9'],
    ['Work interval', '41'],
    ['Heads-up', '7'],
    ['Heads-up', '31'],
    ['Long rest every', '1'],
    ['Long rest every', '7'],
    ['Postpone by', '2'],
  ])('refuses %s = %s: outside the range', async (label, text) => {
    const { onSave, user, replace, save } = setup();
    await replace(label, text);
    await user.click(save());
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each([
    ['Work interval', '10'],
    ['Work interval', '40'],
    ['Heads-up', '8'],
    ['Heads-up', '30'],
    ['Long rest every', '2'],
    ['Long rest every', '6'],
    ['Postpone by', '3'],
    ['Postpone by', '10'],
  ])('saves %s = %s: an end of the range', async (label, text) => {
    const { onSave, user, replace, save } = setup();
    await replace(label, text);
    await user.click(save());
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsForm restore defaults', () => {
  it('puts the default values in the boxes without saving', async () => {
    const { onSave, user, field } = setup({
      initial: { ...DEFAULT_CONFIG, workIntervalMs: 30 * 60_000, postponeMs: 4 * 60_000 },
    });

    await user.click(screen.getByRole('button', { name: copy.settings.actions.restoreDefaults }));

    expect(field('Work interval')).toHaveValue('20');
    expect(field('Postpone by')).toHaveValue('5');
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
      initial: { ...DEFAULT_CONFIG, postponeMs: 4 * 60_000 },
    });
    await user.click(screen.getByRole('button', { name: copy.settings.actions.restoreDefaults }));
    await user.click(save());
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(DEFAULT_CONFIG));
  });
});

describe('SettingsForm close', () => {
  it('has a Close button that calls onClose once and saves nothing', async () => {
    const { onSave, onClose, user } = setup();
    await user.click(screen.getByRole('button', { name: copy.settings.actions.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('is operable with the keyboard', async () => {
    const { onClose, user } = setup();
    screen.getByRole('button', { name: copy.settings.actions.close }).focus();
    await user.keyboard('{Enter}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsForm keyboard', () => {
  it('reaches every field, then Restore defaults, Close and Save, in order with Tab', async () => {
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
      expect(screen.getByRole('textbox', { name })).toHaveFocus();
    }
    for (const name of [
      copy.settings.actions.restoreDefaults,
      copy.settings.actions.close,
      copy.settings.actions.save,
    ]) {
      await user.tab();
      expect(screen.getByRole('button', { name })).toHaveFocus();
    }
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

  it('lets the action row wrap instead of overflowing a narrow window', () => {
    expect(css).toMatch(/__actions\s*\{[^}]*flex-wrap:\s*wrap/);
  });
});

describe('SettingsPage.css contract', () => {
  const css = readFileSync(
    join(__dirname, '../../src/renderer/components/SettingsPage.css'),
    'utf8',
  );

  it('is the scroll container, fixed to the window, so the document never scrolls', () => {
    expect(css).toMatch(/\.er-settings-page\s*\{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.er-settings-page\s*\{[^}]*inset:\s*0/);
    expect(css).toMatch(/\.er-settings-page\s*\{[^}]*overflow-y:\s*auto/);
  });

  it('contains overscroll (better-ui)', () => {
    expect(css).toMatch(/\.er-settings-page\s*\{[^}]*overscroll-behavior:\s*contain/);
  });

  it('draws the scrollbar from design tokens: narrow, rounded, no track fill', () => {
    expect(css).toMatch(/::-webkit-scrollbar\s*\{\s*inline-size:\s*var\(--er-space-3\)/);
    expect(css).toMatch(/::-webkit-scrollbar-track\s*\{\s*background-color:\s*transparent/);
    expect(css).toMatch(
      /::-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*var\(--er-radius-sm\)[^}]*background-color:\s*var\(--er-color-border-strong\)/,
    );
    expect(css).toMatch(/::-webkit-scrollbar-thumb\s*\{[^}]*background-clip:\s*padding-box/);
  });

  it('does not set the standard scrollbar properties, which would replace the themed thumb', () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/scrollbar-(color|width)\s*:/);
  });

  it('highlights the thumb on hover-capable pointers only', () => {
    expect(css).toMatch(
      /@media \(hover: hover\)\s*\{\s*\.er-settings-page::-webkit-scrollbar-thumb:hover/,
    );
  });

  it('gives the thumb a system color in forced-colors mode', () => {
    expect(css).toMatch(/forced-colors:\s*active\)[\s\S]*::-webkit-scrollbar-thumb\s*\{\s*background-color:\s*ButtonText/);
  });
});
