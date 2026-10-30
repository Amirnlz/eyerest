import { useAnnouncement } from '../hooks/use-announcement';
import type { OverlayViewModel } from '../view-model';
import { Announcer } from './Announcer';
import { RestPanel } from './RestPanel';
import { WarningNotice } from './WarningNotice';

export interface OverlayProps {
  readonly viewModel: OverlayViewModel;
  readonly onSkip: () => void;
  readonly onPostpone: () => void;
}

/**
 * Chooses what to show from the view model. Pure view: no IPC, no Electron,
 * no timers. State arrives as props and intents leave as callbacks.
 *
 * Focus is never moved here. The overlay window is shown without taking focus from the user's
 * app, and a focused Skip button would turn a stray Space or Enter into a skipped rest.
 */
export function Overlay({ viewModel, onSkip, onPostpone }: OverlayProps) {
  const announcement = useAnnouncement(viewModel);

  switch (viewModel.mode) {
    case 'hidden':
      return null;
    case 'warning':
      return (
        <>
          <WarningNotice viewModel={viewModel} />
          <Announcer text={announcement} />
        </>
      );
    case 'rest':
      return (
        <>
          <RestPanel viewModel={viewModel} onSkip={onSkip} onPostpone={onPostpone} />
          <Announcer text={announcement} />
        </>
      );
  }
}
