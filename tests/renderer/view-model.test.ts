import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../../src/core/scheduler';
import { copy } from '../../src/renderer/copy';
import { HIDDEN_VIEW_MODEL, toOverlayViewModel } from '../../src/renderer/view-model';

const idle: Snapshot = { state: { phase: 'idle' }, secondsRemaining: null };

const working: Snapshot = {
  state: { phase: 'working', restAt: 1_200_000, restsDone: 0 },
  secondsRemaining: null,
};

const warning = (seconds: number): Snapshot => ({
  state: { phase: 'warning', restAt: 1_200_000, restsDone: 0 },
  secondsRemaining: seconds,
});

const resting = (kind: 'eye' | 'long', seconds: number): Snapshot => ({
  state: { phase: 'resting', kind, endsAt: 1_220_000, restsDone: kind === 'long' ? 2 : 0 },
  secondsRemaining: seconds,
});

describe('toOverlayViewModel', () => {
  it('hides the overlay when idle', () => {
    expect(toOverlayViewModel(idle)).toBe(HIDDEN_VIEW_MODEL);
  });

  it('hides the overlay while working', () => {
    expect(toOverlayViewModel(working)).toBe(HIDDEN_VIEW_MODEL);
  });

  it('describes the warning with a countdown and no actions', () => {
    const vm = toOverlayViewModel(warning(15));
    expect(vm).toEqual({
      mode: 'warning',
      title: copy.warning.title,
      message: copy.warning.message,
      seconds: 15,
      countdown: '15',
    });
    expect('skipLabel' in vm).toBe(false);
  });

  it('describes an eye rest with both actions', () => {
    expect(toOverlayViewModel(resting('eye', 20))).toEqual({
      mode: 'rest',
      kind: 'eye',
      title: copy.rest.eye.title,
      message: copy.rest.eye.message,
      seconds: 20,
      countdown: '20',
      skipLabel: 'Skip',
      postponeLabel: 'Postpone',
    });
  });

  it('describes a long rest with its own text and a m:ss countdown', () => {
    const vm = toOverlayViewModel(resting('long', 600));
    expect(vm).toMatchObject({
      mode: 'rest',
      kind: 'long',
      title: copy.rest.long.title,
      message: copy.rest.long.message,
      seconds: 600,
      countdown: '10:00',
    });
  });

  it('uses different text for eye and long rests', () => {
    expect(copy.rest.eye.title).not.toBe(copy.rest.long.title);
    expect(copy.rest.eye.message).not.toBe(copy.rest.long.message);
  });

  it('shows 0 when a visible phase has no remaining seconds', () => {
    const vm = toOverlayViewModel({ ...warning(0), secondsRemaining: null });
    expect(vm).toMatchObject({ mode: 'warning', seconds: 0, countdown: '0' });
  });

  it('never shows negative seconds', () => {
    const vm = toOverlayViewModel(resting('eye', -3));
    expect(vm).toMatchObject({ mode: 'rest', seconds: 0, countdown: '0' });
  });
});
