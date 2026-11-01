import type { RestViewModel } from '../view-model';
import { Button } from '../ui';
import { ExerciseCue } from './ExerciseCue';
import { OverlayPanel } from './OverlayPanel';

export interface RestPanelProps {
  readonly viewModel: RestViewModel;
  readonly onSkip: () => void;
  readonly onPostpone: () => void;
}

/**
 * Shown during a rest: text, countdown, and the Skip and Postpone actions.
 * Skip is `quiet` and Postpone `secondary`: neither is the one main action, and the calmer
 * Skip does not invite itself.
 * A guided exercise, when present, replaces the static message and adds its cue.
 */
export function RestPanel({ viewModel, onSkip, onPostpone }: RestPanelProps) {
  const exercise = viewModel.exercise;
  return (
    <OverlayPanel
      title={viewModel.title}
      message={exercise?.prompt ?? viewModel.message}
      seconds={viewModel.seconds}
      messageKey={exercise?.id}
      visual={exercise === undefined ? undefined : <ExerciseCue id={exercise.id} />}
    >
      <Button variant="quiet" size="sm" icon="skip" onClick={onSkip}>
        {viewModel.skipLabel}
      </Button>
      <Button variant="secondary" size="sm" icon="postpone" onClick={onPostpone}>
        {viewModel.postponeLabel}
      </Button>
    </OverlayPanel>
  );
}
