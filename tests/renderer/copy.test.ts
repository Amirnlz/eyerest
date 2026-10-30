import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../../src/core/scheduler';
import { announcementFor } from '../../src/renderer/announcements';
import { copy } from '../../src/renderer/copy';
import { toOverlayViewModel } from '../../src/renderer/view-model';

/** Every string the user can read, found by walking the copy object. */
function strings(value: unknown, path = 'copy'): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
  }
  return [];
}

const resting = (kind: 'eye' | 'long', seconds: number): Snapshot => ({
  state: { phase: 'resting', kind, endsAt: 0, restsDone: kind === 'long' ? 2 : 0 },
  secondsRemaining: seconds,
});

describe('copy', () => {
  it.each(strings(copy))('%s is not empty', (_path, text) => {
    expect(text.trim()).not.toBe('');
  });

  it('has a title and a message for the warning and for every rest kind', () => {
    for (const entry of [copy.warning, copy.rest.eye, copy.rest.long]) {
      expect(entry.title.trim()).not.toBe('');
      expect(entry.message.trim()).not.toBe('');
    }
  });

  it('covers exactly the rest kinds the scheduler produces', () => {
    expect(Object.keys(copy.rest).sort()).toEqual(['eye', 'long']);
  });

  it('keeps every view model text and label inside copy', () => {
    const known = new Set(strings(copy).map(([, text]) => text));
    for (const kind of ['eye', 'long'] as const) {
      const vm = toOverlayViewModel(resting(kind, 20));
      if (vm.mode !== 'rest') throw new Error('expected a rest view model');
      for (const text of [vm.title, vm.message, vm.skipLabel, vm.postponeLabel]) {
        expect(known.has(text), text).toBe(true);
      }
    }
  });

  it('builds non-empty announcements for every state', () => {
    const warning = toOverlayViewModel({
      state: { phase: 'warning', restAt: 0, restsDone: 0 },
      secondsRemaining: 15,
    });
    expect(announcementFor(warning, null)?.trim()).toBeTruthy();
    for (const kind of ['eye', 'long'] as const) {
      expect(announcementFor(toOverlayViewModel(resting(kind, 20)), null)?.trim()).toBeTruthy();
    }
    expect(copy.announcements.restEnding('10 seconds').trim()).not.toBe('');
  });
});
