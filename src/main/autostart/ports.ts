/** Whether the app starts at login. The OS owns the answer; nothing is stored in `settings.json`. */
export type AutostartState =
  | { readonly supported: false }
  | { readonly supported: true; readonly enabled: boolean };

export const AUTOSTART_UNSUPPORTED: AutostartState = Object.freeze({ supported: false });

export interface AutostartPort {
  /** Reads the OS. May throw if the OS cannot say; callers treat that as unsupported. */
  getState(): AutostartState;
  /** Registers or removes the login entry. Throws when the OS refuses. */
  setEnabled(enabled: boolean): void;
}
