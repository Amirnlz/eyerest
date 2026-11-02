// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/config';
import { DEFAULT_SCHEDULE } from '../../src/core/schedule';
import { SettingsPage } from '../../src/renderer/components/SettingsPage';
import { copy } from '../../src/renderer/copy';
import { createFakeApi } from '../helpers/fake-api';

describe('SettingsPage', () => {
  it('is the main landmark', () => {
    render(<SettingsPage api={createFakeApi()} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('announces loading, then shows the form with the values from main', async () => {
    const api = createFakeApi();
    api.getSettings.mockResolvedValue({ ...DEFAULT_CONFIG, workIntervalMs: 30 * 60_000 });
    render(<SettingsPage api={api} />);

    expect(screen.getByRole('status')).toHaveTextContent(copy.settings.status.loading);

    const field = await screen.findByRole('textbox', { name: 'Work interval' });
    expect(field).toHaveValue('30');
    expect(screen.queryByText(copy.settings.status.loading)).toBeNull();
  });

  it('asks main once for the settings', async () => {
    const api = createFakeApi();
    render(<SettingsPage api={api} />);
    await screen.findByRole('form', { name: copy.settings.title });
    expect(api.getSettings).toHaveBeenCalledTimes(1);
  });

  it('shows an alert and no form when the settings cannot be loaded', async () => {
    const api = createFakeApi();
    api.getSettings.mockRejectedValue(new Error('ipc down'));
    render(<SettingsPage api={api} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.settings.status.loadFailed);
    expect(screen.queryByRole('form')).toBeNull();
  });

  it('saves through the api and shows the confirmation', async () => {
    const api = createFakeApi();
    render(<SettingsPage api={api} />);
    const user = userEvent.setup();

    const field = await screen.findByRole('textbox', { name: 'Postpone by' });
    await user.clear(field);
    await user.type(field, '3');
    await user.click(screen.getByRole('button', { name: copy.settings.actions.save }));

    expect(api.saveSettings).toHaveBeenCalledWith({ ...DEFAULT_CONFIG, postponeMs: 180_000 });
    expect(await screen.findByText(copy.settings.status.saved)).toBeInTheDocument();
  });

  it('closes the window through the api with the Close button', async () => {
    const api = createFakeApi();
    render(<SettingsPage api={api} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: copy.settings.actions.close }));

    expect(api.closeSettings).toHaveBeenCalledTimes(1);
    expect(api.saveSettings).not.toHaveBeenCalled();
  });

  it('closes the window on Escape', async () => {
    const api = createFakeApi();
    render(<SettingsPage api={api} />);
    const user = userEvent.setup();
    await screen.findByRole('form', { name: copy.settings.title });

    await user.keyboard('{Escape}');

    expect(api.closeSettings).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape while a field has focus', async () => {
    const api = createFakeApi();
    render(<SettingsPage api={api} />);
    const user = userEvent.setup();
    (await screen.findByRole('textbox', { name: 'Postpone by' })).focus();

    await user.keyboard('{Escape}');

    expect(api.closeSettings).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', async () => {
    const api = createFakeApi();
    render(<SettingsPage api={api} />);
    const user = userEvent.setup();
    await screen.findByRole('form', { name: copy.settings.title });

    await user.keyboard('{Enter}a');

    expect(api.closeSettings).not.toHaveBeenCalled();
  });

  it('offers Close, and closes on Escape, when the settings cannot be loaded', async () => {
    const api = createFakeApi();
    api.getSettings.mockRejectedValue(new Error('ipc down'));
    render(<SettingsPage api={api} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: copy.settings.actions.close }));
    expect(api.closeSettings).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(api.closeSettings).toHaveBeenCalledTimes(2);
  });

  it('stops listening for Escape once unmounted', async () => {
    const api = createFakeApi();
    const view = render(<SettingsPage api={api} />);
    const user = userEvent.setup();
    await screen.findByRole('form', { name: copy.settings.title });

    view.unmount();
    await user.keyboard('{Escape}');

    expect(api.closeSettings).not.toHaveBeenCalled();
  });

  it('shows the working hours form below the rest settings, with the stored schedule', async () => {
    const api = createFakeApi();
    api.getSchedule.mockResolvedValue({ ...DEFAULT_SCHEDULE, enabled: true });
    render(<SettingsPage api={api} />);

    const form = await screen.findByRole('form', { name: copy.schedule.title });
    expect(form).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: copy.schedule.enable })).toBeChecked();
    expect(api.getSchedule).toHaveBeenCalledTimes(1);
  });

  it('saves working hours through the api, apart from the rest settings', async () => {
    const api = createFakeApi();
    render(<SettingsPage api={api} />);
    const user = userEvent.setup();

    await screen.findByRole('form', { name: copy.schedule.title });
    await user.click(screen.getByRole('checkbox', { name: copy.schedule.enable }));
    await user.click(screen.getByRole('button', { name: copy.schedule.actions.save }));

    expect(api.saveSchedule).toHaveBeenCalledWith({ ...DEFAULT_SCHEDULE, enabled: true, days: [1, 2, 3, 4, 5] });
    expect(api.saveSettings).not.toHaveBeenCalled();
  });

  it('shows the load failure when only the schedule cannot be loaded', async () => {
    const api = createFakeApi();
    api.getSchedule.mockRejectedValue(new Error('ipc down'));
    render(<SettingsPage api={api} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.settings.status.loadFailed);
    expect(screen.queryByRole('form', { name: copy.schedule.title })).toBeNull();
  });

  it('shows the statistics from main below the working hours', async () => {
    const api = createFakeApi();
    api.getStats.mockResolvedValue([
      { date: '2026-11-02', taken: 4, skipped: 2, postponed: 1 },
    ]);
    render(<SettingsPage api={api} />);

    const table = await screen.findByRole('table', { name: copy.stats.title });
    expect(table).toHaveTextContent('4');
    expect(api.getStats).toHaveBeenCalledTimes(1);
  });

  it('still shows the settings when only the statistics cannot be loaded', async () => {
    const api = createFakeApi();
    api.getStats.mockRejectedValue(new Error('ipc down'));
    render(<SettingsPage api={api} />);

    expect(await screen.findByRole('form', { name: copy.settings.title })).toBeInTheDocument();
    expect(screen.getByText(copy.stats.loadFailed)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
