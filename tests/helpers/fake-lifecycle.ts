import type { SettingsFs } from '../../src/main/settings/settings';
import type { TrayActions, TrayPort } from '../../src/main/tray/tray-controller';
import type { TrayItemId, TrayMenuModel } from '../../src/main/tray/tray-menu';

export class FakeTray implements TrayPort {
  readonly menus: TrayMenuModel[] = [];
  destroyed = 0;
  private onSelect: ((id: TrayItemId) => void) | null = null;

  setMenu(model: TrayMenuModel, onSelect: (id: TrayItemId) => void): void {
    this.menus.push(model);
    this.onSelect = onSelect;
  }
  destroy(): void {
    this.destroyed += 1;
  }

  get menu(): TrayMenuModel {
    const model = this.menus.at(-1);
    if (!model) throw new Error('No menu set yet');
    return model;
  }

  /** The labels of the real (non-separator) items, in order. */
  get labels(): string[] {
    return this.menu.items.flatMap((item) => (item.kind === 'item' ? [item.label] : []));
  }

  /** Simulates the user clicking a menu item. */
  click(id: TrayItemId): void {
    if (!this.onSelect) throw new Error('No menu set yet');
    this.onSelect(id);
  }
}

export class FakeTrayActions implements TrayActions {
  readonly calls: string[] = [];
  pause(): void {
    this.calls.push('pause');
  }
  resume(): void {
    this.calls.push('resume');
  }
  openSettings(): void {
    this.calls.push('openSettings');
  }
  quit(): void {
    this.calls.push('quit');
  }
}

/** In-memory file system that records operations in order. */
export class FakeSettingsFs implements SettingsFs {
  readonly files = new Map<string, string>();
  readonly ops: string[] = [];
  readError: Error | null = null;
  failOn: 'writeFile' | 'rename' | null = null;

  readFile(path: string): string | null {
    if (this.readError) throw this.readError;
    return this.files.get(path) ?? null;
  }
  writeFile(path: string, text: string): void {
    this.ops.push(`writeFile ${path}`);
    if (this.failOn === 'writeFile') throw new Error('disk full');
    this.files.set(path, text);
  }
  rename(from: string, to: string): void {
    this.ops.push(`rename ${from} ${to}`);
    if (this.failOn === 'rename') throw new Error('rename failed');
    const text = this.files.get(from);
    if (text === undefined) throw new Error('no such file');
    this.files.delete(from);
    this.files.set(to, text);
  }
  remove(path: string): void {
    this.ops.push(`remove ${path}`);
    this.files.delete(path);
  }
  ensureDir(path: string): void {
    this.ops.push(`ensureDir ${path}`);
  }
}
