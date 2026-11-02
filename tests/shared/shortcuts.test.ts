import { describe, expect, it } from 'vitest';
import { NO_SHORTCUT_HINTS, parseShortcutHints } from '../../src/shared/shortcuts';

describe('parseShortcutHints', () => {
  it('accepts labels and nulls', () => {
    expect(parseShortcutHints({ skip: 'Ctrl+Alt+Shift+S', postpone: null })).toEqual({
      skip: 'Ctrl+Alt+Shift+S',
      postpone: null,
    });
    expect(parseShortcutHints({ skip: null, postpone: null })).toEqual(NO_SHORTCUT_HINTS);
    expect(parseShortcutHints({ skip: '⌥⇧⌘S', postpone: '⌥⇧⌘P' })).not.toBeNull();
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'Ctrl+S'],
    ['an array', []],
    ['an empty object', {}],
    ['a missing key', { skip: 'a' }],
    ['an extra key', { skip: 'a', postpone: 'b', other: 'c' }],
    ['a number label', { skip: 1, postpone: null }],
    ['an empty label', { skip: '', postpone: null }],
    ['a blank label', { skip: '   ', postpone: null }],
    ['an undefined label', { skip: undefined, postpone: null }],
    ['a label that is too long', { skip: 'x'.repeat(33), postpone: null }],
  ])('rejects %s', (_name, value) => {
    expect(parseShortcutHints(value)).toBeNull();
  });
});
