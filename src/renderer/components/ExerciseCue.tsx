import { Icon } from '../ui';
import type { ExerciseId } from '../exercise/exercises';
import './ExerciseCue.css';

export interface ExerciseCueProps {
  readonly id: ExerciseId;
}

/**
 * A small looping picture for the exercise. It repeats what the text says and is never the only
 * cue, so it is hidden from assistive tech. Motion runs only when the person has not asked for
 * reduced motion; otherwise the still picture stays (see `ExerciseCue.css`).
 */
export function ExerciseCue({ id }: ExerciseCueProps) {
  return (
    <span className={`er-exercise-cue er-exercise-cue--${id}`} aria-hidden="true">
      <span className="er-exercise-cue__ring" />
      <span className="er-exercise-cue__orbit">
        <span className="er-exercise-cue__dot" />
      </span>
      <span className="er-exercise-cue__eye">
        <Icon name="eye" size="lg" />
      </span>
    </span>
  );
}
