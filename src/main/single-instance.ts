/** The part of Electron's `app` the single-instance guard uses. */
export interface SingleInstanceApp {
  requestSingleInstanceLock(): boolean;
  quit(): void;
}

/**
 * Takes the single-instance lock. A second launch fails to get it and quits
 * at once, without focusing or showing anything (the app has no window).
 * Returns `true` when this process is the primary instance.
 */
export function acquireSingleInstance(app: SingleInstanceApp): boolean {
  const acquired = app.requestSingleInstanceLock();
  if (!acquired) app.quit();
  return acquired;
}
