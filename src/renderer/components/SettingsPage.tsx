import { useEffect, useState } from 'react';
import type { RestConfig } from '../../core/config';
import type { EyerestApi } from '../../shared/ipc';
import { copy } from '../copy';
import { Button, Text } from '../ui';
import { SettingsForm } from './SettingsForm';
import './SettingsPage.css';

export type SettingsSource = Pick<EyerestApi, 'getSettings' | 'saveSettings' | 'closeSettings'>;

export interface SettingsPageProps {
  readonly api: SettingsSource;
}

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly settings: RestConfig }
  | { readonly kind: 'failed' };

/** The settings screen: loads the saved values from main, then hands them to the form. */
export function SettingsPage({ api }: SettingsPageProps) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    api
      .getSettings()
      .then((settings) => {
        if (active) setLoad({ kind: 'ready', settings });
      })
      .catch(() => {
        if (active) setLoad({ kind: 'failed' });
      });
    return () => {
      active = false;
    };
  }, [api]);

  // Escape closes the window, the usual way out of a dialog. A key already handled (for example
  // by a control) is left alone.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !event.defaultPrevented) api.closeSettings();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [api]);

  return (
    <main className="er-settings-page">
      {load.kind === 'loading' ? (
        <Text role="status" tone="secondary">
          {copy.settings.status.loading}
        </Text>
      ) : null}
      {load.kind === 'failed' ? (
        <>
          <Text role="alert">{copy.settings.status.loadFailed}</Text>
          <Button variant="quiet" onClick={() => api.closeSettings()}>
            {copy.settings.actions.close}
          </Button>
        </>
      ) : null}
      {load.kind === 'ready' ? (
        <SettingsForm
          initial={load.settings}
          onSave={(settings) => api.saveSettings(settings)}
          onClose={() => api.closeSettings()}
        />
      ) : null}
    </main>
  );
}
