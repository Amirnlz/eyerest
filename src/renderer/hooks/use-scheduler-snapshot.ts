import { useEffect, useState } from 'react';
import type { Snapshot } from '../../core/scheduler';
import type { EyerestApi } from '../../shared/ipc';

export type SnapshotSource = Pick<EyerestApi, 'getSnapshot' | 'onSnapshot'>;

/**
 * Subscribes to scheduler snapshots. Returns null until the first one arrives.
 *
 * The initial `getSnapshot()` answer can arrive after a pushed snapshot; a
 * pushed snapshot is always newer, so the initial answer never overwrites it.
 */
export function useSchedulerSnapshot(source: SnapshotSource): Snapshot | null {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = source.onSnapshot((pushed) => {
      if (active) setSnapshot(pushed);
    });

    source
      .getSnapshot()
      .then((initial) => {
        if (active) setSnapshot((current) => current ?? initial);
      })
      .catch(() => {
        // The next pushed snapshot fills the state; nothing to do here.
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [source]);

  return snapshot;
}
