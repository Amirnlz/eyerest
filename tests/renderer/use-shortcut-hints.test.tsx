// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useShortcutHints } from '../../src/renderer/hooks/use-shortcut-hints';
import { NO_SHORTCUT_HINTS } from '../../src/shared/shortcuts';
import { createFakeApi } from '../helpers/fake-api';

describe('useShortcutHints', () => {
  it('starts with no shortcuts, so nothing is advertised before main registers a key', () => {
    const { result } = renderHook(() => useShortcutHints(createFakeApi()));
    expect(result.current).toEqual(NO_SHORTCUT_HINTS);
  });

  it('follows pushes from main, including the clear at the end of a rest', () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useShortcutHints(api));

    act(() => api.pushShortcuts({ skip: 'Ctrl+Alt+Shift+S', postpone: 'Ctrl+Alt+Shift+P' }));
    expect(result.current).toEqual({ skip: 'Ctrl+Alt+Shift+S', postpone: 'Ctrl+Alt+Shift+P' });

    act(() => api.pushShortcuts({ skip: null, postpone: null }));
    expect(result.current).toEqual(NO_SHORTCUT_HINTS);
  });

  it('unsubscribes on unmount', () => {
    const api = createFakeApi();
    const { unmount } = renderHook(() => useShortcutHints(api));
    expect(api.shortcutsListenerCount()).toBe(1);
    unmount();
    expect(api.shortcutsListenerCount()).toBe(0);
  });
});
