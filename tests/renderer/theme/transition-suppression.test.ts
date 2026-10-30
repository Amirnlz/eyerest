// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  SUPPRESSION_CSS,
  createTransitionSuppressor,
} from '../../../src/renderer/theme';

/** A frame queue the test advances by hand. */
function frames() {
  const queue: (() => void)[] = [];
  return {
    requestFrame: (callback: () => void) => void queue.push(callback),
    run() {
      const batch = queue.splice(0);
      for (const callback of batch) callback();
    },
    pending: () => queue.length,
  };
}

const overrides = () =>
  [...document.head.querySelectorAll('style')].filter(
    (style) => style.textContent === SUPPRESSION_CSS,
  );

afterEach(() => {
  document.head.replaceChildren();
  Reflect.deleteProperty(document.body, 'offsetHeight');
});

describe('createTransitionSuppressor', () => {
  it('switches every transition off with one temporary rule', () => {
    expect(SUPPRESSION_CSS).toBe('*,*::before,*::after{transition:none !important}');
  });

  it('has the override in place while the change is applied', () => {
    const queue = frames();
    const suppress = createTransitionSuppressor({ document, requestFrame: queue.requestFrame });
    let presentDuringApply = -1;

    suppress(() => {
      presentDuringApply = overrides().length;
    });

    expect(presentDuringApply).toBe(1);
  });

  it('forces a style flush after applying and before scheduling the removal', () => {
    const order: string[] = [];
    Object.defineProperty(document.body, 'offsetHeight', {
      configurable: true,
      get: () => {
        order.push('flush');
        return 0;
      },
    });
    const suppress = createTransitionSuppressor({
      document,
      requestFrame: (callback) => {
        order.push('frame');
        void callback;
      },
    });

    suppress(() => order.push('apply'));

    expect(order).toEqual(['apply', 'flush', 'frame']);
  });

  it('keeps the override for two frames, then removes it', () => {
    const queue = frames();
    const suppress = createTransitionSuppressor({ document, requestFrame: queue.requestFrame });

    suppress(() => undefined);
    expect(overrides()).toHaveLength(1);

    queue.run();
    expect(overrides()).toHaveLength(1);

    queue.run();
    expect(overrides()).toHaveLength(0);
    expect(queue.pending()).toBe(0);
  });

  it('removes only its own override when two changes overlap', () => {
    const queue = frames();
    const suppress = createTransitionSuppressor({ document, requestFrame: queue.requestFrame });

    suppress(() => undefined);
    queue.run();
    suppress(() => undefined);
    expect(overrides()).toHaveLength(2);

    queue.run();
    expect(overrides()).toHaveLength(1);
    queue.run();
    expect(overrides()).toHaveLength(0);
  });

  it('still restores transitions when the change throws', () => {
    const queue = frames();
    const suppress = createTransitionSuppressor({ document, requestFrame: queue.requestFrame });

    expect(() =>
      suppress(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    queue.run();
    queue.run();
    expect(overrides()).toHaveLength(0);
  });
});
