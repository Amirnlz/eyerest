import { useId } from 'react';
import type { WarningViewModel } from '../view-model';

export interface WarningNoticeProps {
  readonly viewModel: WarningViewModel;
}

/** Heads-up shown before a rest. Informational only: it has no actions. */
export function WarningNotice({ viewModel }: WarningNoticeProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{viewModel.title}</h2>
      <p>{viewModel.message}</p>
      <p role="timer">{viewModel.countdown}</p>
    </section>
  );
}
