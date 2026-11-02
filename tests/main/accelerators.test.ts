import { describe, expect, it } from 'vitest';
import { DEFAULT_ACCELERATORS, formatAccelerator } from '../../src/main/shortcuts/accelerators';

describe('DEFAULT_ACCELERATORS', () => {
  it('are different keys, each with three modifiers', () => {
    expect(DEFAULT_ACCELERATORS.skip).not.toBe(DEFAULT_ACCELERATORS.postpone);
    for (const accelerator of Object.values(DEFAULT_ACCELERATORS)) {
      expect(accelerator.split('+')).toHaveLength(4);
    }
  });
});

describe('formatAccelerator', () => {
  it.each<[NodeJS.Platform, string]>([
    ['win32', 'Ctrl+Alt+Shift+S'],
    ['linux', 'Ctrl+Alt+Shift+S'],
    ['darwin', '⌥⇧⌘S'],
  ])('shows the default Skip key on %s as %s', (platform, text) => {
    expect(formatAccelerator(DEFAULT_ACCELERATORS.skip, platform)).toBe(text);
  });

  it('shows Postpone with its own key', () => {
    expect(formatAccelerator(DEFAULT_ACCELERATORS.postpone, 'linux')).toBe('Ctrl+Alt+Shift+P');
    expect(formatAccelerator(DEFAULT_ACCELERATORS.postpone, 'darwin')).toBe('⌥⇧⌘P');
  });

  it('puts modifiers in a fixed order whatever the input order, and upper-cases the key', () => {
    expect(formatAccelerator('Shift+Alt+Ctrl+x', 'win32')).toBe('Ctrl+Alt+Shift+X');
    expect(formatAccelerator('Command+Shift+Alt+Control+x', 'darwin')).toBe('⌃⌥⇧⌘X');
  });

  it('reads aliases and keeps named keys as they are', () => {
    expect(formatAccelerator('CmdOrCtrl+Option+F5', 'darwin')).toBe('⌥⌘F5');
    expect(formatAccelerator('Ctrl+F5', 'linux')).toBe('Ctrl+F5');
  });
});
