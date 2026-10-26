import type { EyerestApi } from '../shared/ipc';

declare global {
  interface Window {
    /** Exposed by the preload script. Undefined outside Electron. */
    eyerest?: EyerestApi;
  }
}

export {};
