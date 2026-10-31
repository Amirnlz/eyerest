import type {
  SettingsWindowFactory,
  SettingsWindowPort,
} from '../../src/main/settings/window-ports';

export class FakeSettingsWindow implements SettingsWindowPort {
  focused = 0;
  closeCalls = 0;
  destroyed = false;
  private closedListener: (() => void) | null = null;

  focus(): void {
    this.focused += 1;
  }
  onClosed(listener: () => void): void {
    this.closedListener = listener;
  }
  close(): void {
    this.closeCalls += 1;
    this.userCloses();
  }
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /** Simulates the user closing the window with its title bar button. */
  userCloses(): void {
    this.destroyed = true;
    this.closedListener?.();
  }

  /** Simulates the window being destroyed without a `closed` event reaching the manager. */
  vanish(): void {
    this.destroyed = true;
  }
}

export class FakeSettingsWindowFactory implements SettingsWindowFactory {
  readonly windows: FakeSettingsWindow[] = [];

  create(): FakeSettingsWindow {
    const window = new FakeSettingsWindow();
    this.windows.push(window);
    return window;
  }

  get last(): FakeSettingsWindow {
    const window = this.windows.at(-1);
    if (!window) throw new Error('No settings window created yet');
    return window;
  }
}
