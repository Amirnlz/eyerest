import type { OverlayViewModel } from '../view-model';
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
 */
export function Overlay({ viewModel, onSkip, onPostpone }: OverlayProps) {
  switch (viewModel.mode) {
    case 'hidden':
      return null;
    case 'warning':
      return <WarningNotice viewModel={viewModel} />;
    case 'rest':
      return <RestPanel viewModel={viewModel} onSkip={onSkip} onPostpone={onPostpone} />;
  }
}
