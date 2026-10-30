import type { TransitionSuppressor } from './theme-controller';

/** The one allowed `!important` (C11 exception): a temporary override that is removed again. */
export const SUPPRESSION_CSS =
  '*,*::before,*::after{transition:none !important}';

export interface SuppressionEnvironment {
  readonly document: Document;
  /** Calls `callback` before the next paint. */
  readonly requestFrame: (callback: () => void) => void;
}

/**
 * Recipe from better-ui: add the override, apply the change, force a style flush so the new
 * values resolve with no transition, then remove the override after two frames. Two frames,
 * because one can still be the frame that computes the changed styles.
 */
export function createTransitionSuppressor(
  env: SuppressionEnvironment,
): TransitionSuppressor {
  return (apply) => {
    const { document: doc, requestFrame } = env;
    const style = doc.createElement('style');
    style.textContent = SUPPRESSION_CSS;
    doc.head.append(style);
    try {
      apply();
    } finally {
      void doc.body.offsetHeight; // force a synchronous style flush
      requestFrame(() => {
        requestFrame(() => style.remove());
      });
    }
  };
}
