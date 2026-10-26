import type { Snapshot } from '../../core/scheduler';

export interface DebugStatusProps {
  readonly snapshot: Snapshot | null;
}

/** TEMPORARY (Step 1.3 only): shows the current phase in the test window. */
export function DebugStatus({ snapshot }: DebugStatusProps) {
  return <p>Phase: {snapshot === null ? 'connecting' : snapshot.state.phase}</p>;
}
