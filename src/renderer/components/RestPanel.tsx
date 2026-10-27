import { useId } from 'react';
import type { RestViewModel } from '../view-model';

export interface RestPanelProps {
  readonly viewModel: RestViewModel;
  readonly onSkip: () => void;
  readonly onPostpone: () => void;
  readonly surface?: boolean;
}

/** Shown during a rest: text, countdown, and the Skip and Postpone actions. */
export function RestPanel({ viewModel, onSkip, onPostpone, surface = false }: RestPanelProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      style={surface ? { boxSizing: 'border-box', height: '100%', padding: 8 } : undefined}
    >
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
