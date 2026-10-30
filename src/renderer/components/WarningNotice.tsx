import type { WarningViewModel } from '../view-model';
import { OverlayPanel } from './OverlayPanel';

export interface WarningNoticeProps {
  readonly viewModel: WarningViewModel;
}

/** Heads-up shown before a rest. Informational only: it has no actions. */
export function WarningNotice({ viewModel }: WarningNoticeProps) {
  return (
    <OverlayPanel
      title={viewModel.title}
      message={viewModel.message}
      seconds={viewModel.seconds}
    />
  );
}
