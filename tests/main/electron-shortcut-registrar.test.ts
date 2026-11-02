import { describe, expect, it, vi } from 'vitest';
import { createElectronShortcutRegistrar } from '../../src/main/shortcuts/electron-shortcut-registrar';

describe('createElectronShortcutRegistrar', () => {
  it('passes register through with the handler and returns the OS answer', () => {
    const register = vi.fn((_accelerator: string, _callback: () => void) => true);
    const registrar = createElectronShortcutRegistrar({ register, unregister: vi.fn() });
    const handler = vi.fn();

    expect(registrar.register('CommandOrControl+Alt+Shift+S', handler)).toBe(true);
    expect(register).toHaveBeenCalledWith('CommandOrControl+Alt+Shift+S', handler);

    register.mockReturnValue(false);
    expect(registrar.register('Ctrl+K', handler)).toBe(false);
  });

  it('passes unregister through', () => {
    const unregister = vi.fn();
    createElectronShortcutRegistrar({ register: vi.fn(() => true), unregister }).unregister('Ctrl+K');
    expect(unregister).toHaveBeenCalledWith('Ctrl+K');
  });

  it('lets a throw from the OS reach the controller, which handles it', () => {
    const registrar = createElectronShortcutRegistrar({
      register: () => {
        throw new Error('bad accelerator');
      },
      unregister: vi.fn(),
    });
    expect(() => registrar.register('nope', () => undefined)).toThrow('bad accelerator');
  });
});
