import { describe, expect, it, vi } from 'vitest';
import { createBroadcastShortcutHintsOutput } from '../../src/main/shortcuts/shortcut-hints-output';
import { IPC } from '../../src/shared/ipc';

const hints = { skip: 'Ctrl+Alt+Shift+S', postpone: null };

function target(options: { destroyed?: boolean; throws?: boolean } = {}) {
  return {
    isDestroyed: () => options.destroyed === true,
    send: vi.fn((_channel: string, ..._args: unknown[]) => {
      if (options.throws === true) throw new Error('gone');
    }),
  };
}

describe('createBroadcastShortcutHintsOutput', () => {
  it('sends the hints on the shortcuts channel to every live renderer', () => {
    const a = target();
    const b = target();
    createBroadcastShortcutHintsOutput(() => [a, b]).push(hints);
    expect(a.send).toHaveBeenCalledWith(IPC.shortcuts.channel, hints);
    expect(b.send).toHaveBeenCalledWith(IPC.shortcuts.channel, hints);
  });

  it('skips a destroyed renderer, and a failing one never blocks the rest', () => {
    const dead = target({ destroyed: true });
    const broken = target({ throws: true });
    const live = target();
    const errors: unknown[] = [];
    createBroadcastShortcutHintsOutput(() => [dead, broken, live], (error) => errors.push(error)).push(
      hints,
    );
    expect(dead.send).not.toHaveBeenCalled();
    expect(live.send).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(1);
  });
});
