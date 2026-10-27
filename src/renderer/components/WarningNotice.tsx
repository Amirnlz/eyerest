import { useId } from 'react';
import type { WarningViewModel } from '../view-model';

export interface WarningNoticeProps {
  readonly viewModel: WarningViewModel;
  readonly surface?: boolean;
}

/** Heads-up shown before a rest. Informational only: it has no actions. */
export function WarningNotice({ viewModel, surface = false }: WarningNoticeProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      style={surface ? { boxSizing: 'border-box', height: '100%', padding: 8 } : undefined}
    >
      <h2 id={titleId}>{viewModel.title}</h2>
      <p>{viewModel.message}</p>
      <p role="timer">{viewModel.countdown}</p>
    </section>
  );
}
