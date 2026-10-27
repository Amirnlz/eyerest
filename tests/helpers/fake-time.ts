import type { Clock, Ticker } from '../../src/core/scheduler';

/** Manual clock + ticker: tests advance time explicitly, no real timers. */
export class FakeTime implements Clock, Ticker {
  private current = 0;
  private callback: (() => void) | null = null;
  private interval = 0;
  activeTickers = 0;

  now(): number {
    return this.current;
  }

  start(callback: () => void, intervalMs: number): () => void {
    this.callback = callback;
    this.interval = intervalMs;
    this.activeTickers++;
    return () => {
      this.callback = null;
      this.activeTickers--;
    };
  }

  /** Advances time in ticker-sized steps, firing the callback each step. */
  advance(ms: number): void {
    const step = this.interval || ms;
    const steps = Math.ceil(ms / step);
    for (let i = 0; i < steps; i++) {
      this.current += Math.min(step, ms - i * step);
      this.callback?.();
    }
  }
}
