import { useEffect, useState } from 'react';
import type { EyerestApi } from '../../shared/ipc';
import { NO_SHORTCUT_HINTS, type ShortcutHints } from '../../shared/shortcuts';

export type ShortcutHintsSource = Pick<EyerestApi, 'onShortcuts'>;

/**
 * The global shortcuts main has registered for the rest now showing. Starts with none and follows
 * main's pushes, which arrive when a rest begins and clear when it ends. A key that is not listed
 * is never advertised.
 */
export function useShortcutHints(source: ShortcutHintsSource): ShortcutHints {
  const [hints, setHints] = useState<ShortcutHints>(NO_SHORTCUT_HINTS);

  useEffect(() => source.onShortcuts(setHints), [source]);

  return hints;
}
