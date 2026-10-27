import type { Rect } from '../../src/main/overlay/bounds';
import type {
  DimDisplay,
  DimDisplayPort,
  DimWindowFactory,
  DimWindowPort,
} from '../../src/main/dim/ports';

export class FakeDimWindow implements DimWindowPort {
  /** Every call in order, e.g. `['setInteractive(true)', 'setBounds', 'showInactive']`. */
  readonly calls: string[] = [];
  readonly boundsHistory: Rect[] = [];
  destroyed = false;
  visible = false;
  /** Mirrors the real window: new windows are click-through. */
  interactive = false;

  constructor(readonly createdWith: Rect) {}

  setBounds(bounds: Rect): void {
    this.calls.push('setBounds');
    this.boundsHistory.push(bounds);
  }
  showInactive(): void {
    this.calls.push('showInactive');
    this.visible = true;
  }
  hide(): void {
    this.calls.push('hide');
    this.visible = false;
  }
  setInteractive(interactive: boolean): void {
    this.calls.push(`setInteractive(${interactive})`);
    this.interactive = interactive;
  }
  isDestroyed(): boolean {
    return this.destroyed;
  }
  destroy(): void {
    this.calls.push('destroy');
    this.destroyed = true;
    this.visible = false;
  }

  count(call: string): number {
    return this.calls.filter((entry) => entry === call).length;
  }
}

export class FakeDimWindowFactory implements DimWindowFactory {
  readonly windows: FakeDimWindow[] = [];

  create(bounds: Rect): FakeDimWindow {
    const window = new FakeDimWindow(bounds);
    this.windows.push(window);
    return window;
  }

  window(index: number): FakeDimWindow {
    const window = this.windows[index];
    if (!window) throw new Error(`No dim window at index ${index}`);
    return window;
  }

  /** Windows that were not destroyed. */
  get live(): FakeDimWindow[] {
    return this.windows.filter((window) => !window.destroyed);
  }
}

export class FakeDimDisplays implements DimDisplayPort {
  private readonly listeners = new Set<() => void>();

  constructor(
    public displays: readonly DimDisplay[] = [
      { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    ],
  ) {}

  getDisplays(): readonly DimDisplay[] {
    return this.displays;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Simulates a display change (monitor plugged, unplugged, resized). */
  change(displays: readonly DimDisplay[]): void {
    this.displays = displays;
    for (const listener of [...this.listeners]) listener();
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}
