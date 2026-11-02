import { useId } from 'react';
import { copy } from '../copy';
import type { ShortcutHints } from '../../shared/shortcuts';
import type { RestViewModel } from '../view-model';
import { Button, VisuallyHidden } from '../ui';
import { ExerciseCue } from './ExerciseCue';
import { OverlayPanel } from './OverlayPanel';

export interface RestPanelProps {
  readonly viewModel: RestViewModel;
  readonly onSkip: () => void;
  readonly onPostpone: () => void;
  /** Global shortcuts main registered for this rest. Absent or null entries show nothing. */
  readonly shortcuts?: ShortcutHints;
}

/**
 * Shown during a rest: text, countdown, and the Skip and Postpone actions.
 * Skip is `quiet` and Postpone `secondary`: neither is the one main action, and the calmer
 * Skip does not invite itself.
 * A guided exercise, when present, replaces the static message and adds its cue.
 * A registered global shortcut is offered as a tooltip and as a description read with the button.
 * It takes no room in the panel, whose size is fixed; a visible hint is a design decision.
 */
export function RestPanel({ viewModel, onSkip, onPostpone, shortcuts }: RestPanelProps) {
  const exercise = viewModel.exercise;
  const skipHintId = useId();
  const postponeHintId = useId();
  const skipKeys = shortcuts?.skip ?? null;
  const postponeKeys = shortcuts?.postpone ?? null;
  return (
    <OverlayPanel
      title={viewModel.title}
      message={exercise?.prompt ?? viewModel.message}
      seconds={viewModel.seconds}
      messageKey={exercise?.id}
      visual={exercise === undefined ? undefined : <ExerciseCue id={exercise.id} />}
    >
      <Button
        variant="quiet"
        size="sm"
        icon="skip"
        onClick={onSkip}
        title={skipKeys === null ? undefined : copy.actions.shortcut(skipKeys)}
        aria-describedby={skipKeys === null ? undefined : skipHintId}
      >
        {viewModel.skipLabel}
      </Button>
      {skipKeys === null ? null : (
        <VisuallyHidden id={skipHintId}>{copy.actions.shortcut(skipKeys)}</VisuallyHidden>
      )}
      <Button
        variant="secondary"
        size="sm"
        icon="postpone"
        onClick={onPostpone}
        title={postponeKeys === null ? undefined : copy.actions.shortcut(postponeKeys)}
        aria-describedby={postponeKeys === null ? undefined : postponeHintId}
      >
        {viewModel.postponeLabel}
      </Button>
      {postponeKeys === null ? null : (
        <VisuallyHidden id={postponeHintId}>{copy.actions.shortcut(postponeKeys)}</VisuallyHidden>
      )}
    </OverlayPanel>
  );
}
