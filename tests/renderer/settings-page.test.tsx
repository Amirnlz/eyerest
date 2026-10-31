// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/config';
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
    await screen.findByRole('form');
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
    await screen.findByRole('form');

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
    await screen.findByRole('form');

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
    await screen.findByRole('form');

    view.unmount();
    await user.keyboard('{Escape}');

    expect(api.closeSettings).not.toHaveBeenCalled();
  });
});
