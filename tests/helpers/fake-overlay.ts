import type { Rect } from '../../src/main/overlay/bounds';
import type {
  DisplayPort,
  OverlayWindowFactory,
  OverlayWindowPort,
} from '../../src/main/overlay/ports';

export class FakeOverlayWindow implements OverlayWindowPort {
  /** Every call in order, e.g. `['setBounds', 'showInactive', 'hide']`. */
  readonly calls: string[] = [];
  readonly boundsHistory: Rect[] = [];
  destroyed = false;
  visible = false;

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

export class FakeWindowFactory implements OverlayWindowFactory {
  readonly windows: FakeOverlayWindow[] = [];

  create(bounds: Rect): FakeOverlayWindow {
    const window = new FakeOverlayWindow(bounds);
    this.windows.push(window);
    return window;
  }

  get last(): FakeOverlayWindow {
    const window = this.windows.at(-1);
    if (!window) throw new Error('No window created yet');
    return window;
  }
}

export class FakeDisplays implements DisplayPort {
  private readonly listeners = new Set<() => void>();

  constructor(public workArea: Rect = { x: 0, y: 0, width: 1920, height: 1080 }) {}

  getPrimaryWorkArea(): Rect {
    return this.workArea;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Simulates a display change (monitor plugged, resolution changed). */
  change(workArea: Rect): void {
    this.workArea = workArea;
    for (const listener of [...this.listeners]) listener();
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}
