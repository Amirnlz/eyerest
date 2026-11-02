import type { ShortcutRegistrar } from '../../src/main/shortcuts/ports';

/** A shortcut table the test can press keys on. Mirrors Electron: a key owned elsewhere is refused. */
export class FakeShortcutRegistrar implements ShortcutRegistrar {
  readonly handlers = new Map<string, () => void>();
  readonly calls: string[] = [];
  /** Accelerators another app owns: `register` answers false. */
  readonly refused = new Set<string>();
  /** Accelerators whose `register` throws. */
  readonly throwing = new Set<string>();
  unregisterError: Error | null = null;

  register(accelerator: string, handler: () => void): boolean {
    this.calls.push(`register ${accelerator}`);
    if (this.throwing.has(accelerator)) throw new Error('boom');
    if (this.refused.has(accelerator) || this.handlers.has(accelerator)) return false;
    this.handlers.set(accelerator, handler);
    return true;
  }

  unregister(accelerator: string): void {
    this.calls.push(`unregister ${accelerator}`);
    if (this.unregisterError !== null) throw this.unregisterError;
    this.handlers.delete(accelerator);
  }

  /** The OS delivers the key press. Does nothing for a key that is not registered. */
  press(accelerator: string): void {
    this.handlers.get(accelerator)?.();
  }

  get registered(): string[] {
    return [...this.handlers.keys()].sort();
  }
}
