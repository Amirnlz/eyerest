import { useId } from 'react';
import type { RestViewModel } from '../view-model';

export interface RestPanelProps {
  readonly viewModel: RestViewModel;
  readonly onSkip: () => void;
  readonly onPostpone: () => void;
}

/** Shown during a rest: text, countdown, and the Skip and Postpone actions. */
export function RestPanel({ viewModel, onSkip, onPostpone }: RestPanelProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{viewModel.title}</h2>
      <p>{viewModel.message}</p>
      <p role="timer">{viewModel.countdown}</p>
      <div>
        <button type="button" onClick={onSkip}>
          {viewModel.skipLabel}
        </button>
        <button type="button" onClick={onPostpone}>
          {viewModel.postponeLabel}
        </button>
      </div>
    </section>
  );
}
