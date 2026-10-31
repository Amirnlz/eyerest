export type AppView = 'overlay' | 'settings';

/**
 * Which screen this window shows. One renderer bundle serves both windows; the main process
 * opens the settings window with `?view=settings`. Anything else is the overlay, so the overlay
 * window keeps working with no parameter at all.
 */
export function resolveView(search: string): AppView {
  return new URLSearchParams(search).get('view') === 'settings' ? 'settings' : 'overlay';
}
