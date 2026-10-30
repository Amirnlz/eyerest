import { describe, expect, it } from 'vitest';
import { announcementFor, restMilestones } from '../../src/renderer/announcements';
import { copy } from '../../src/renderer/copy';
import type { OverlayViewModel } from '../../src/renderer/view-model';
import { HIDDEN_VIEW_MODEL } from '../../src/renderer/view-model';

const warning = (seconds: number): OverlayViewModel => ({
  mode: 'warning',
  title: copy.warning.title,
  message: copy.warning.message,
  seconds,
  countdown: String(seconds),
});

const rest = (kind: 'eye' | 'long', seconds: number): OverlayViewModel => ({
  mode: 'rest',
  kind,
  title: copy.rest[kind].title,
  message: copy.rest[kind].message,
  seconds,
  countdown: String(seconds),
  skipLabel: copy.actions.skip,
  postponeLabel: copy.actions.postpone,
});

describe('announcementFor: entering a phase', () => {
  it('announces the warning once, with its length', () => {
    expect(announcementFor(warning(15), null)).toBe('Eye rest starts in 15 seconds.');
    expect(announcementFor(warning(15), HIDDEN_VIEW_MODEL)).toBe('Eye rest starts in 15 seconds.');
  });

  it('announces an eye rest with its title and length', () => {
    expect(announcementFor(rest('eye', 20), warning(1))).toBe('Rest your eyes for 20 seconds.');
  });

  it('announces a long rest in minutes', () => {
    expect(announcementFor(rest('long', 600), warning(1))).toBe(
      'Take a longer break for 10 minutes.',
    );
  });

  it('announces a rest that is the first thing seen, such as after a window reload', () => {
    expect(announcementFor(rest('eye', 12), null)).toBe('Rest your eyes for 12 seconds.');
  });

  it('says nothing when hidden', () => {
    expect(announcementFor(HIDDEN_VIEW_MODEL, rest('eye', 1))).toBeNull();
    expect(announcementFor(HIDDEN_VIEW_MODEL, null)).toBeNull();
  });
});

describe('announcementFor: A2, never every second', () => {
  it('is silent on every warning tick', () => {
    for (let s = 14; s >= 0; s--) {
      expect(announcementFor(warning(s), warning(s + 1))).toBeNull();
    }
  });

  it('is silent on every tick of an eye rest', () => {
    for (let s = 19; s >= 0; s--) {
      expect(announcementFor(rest('eye', s), rest('eye', s + 1))).toBeNull();
    }
  });

  it('announces a long rest exactly twice after the start, at its milestones', () => {
    const spoken: string[] = [];
    for (let s = 599; s >= 0; s--) {
      const text = announcementFor(rest('long', s), rest('long', s + 1));
      if (text !== null) spoken.push(text);
    }
    expect(spoken).toEqual(['1 minute left.', '10 seconds left.']);
  });

  it('is silent when the same snapshot repeats', () => {
    expect(announcementFor(rest('long', 60), rest('long', 60))).toBeNull();
    expect(announcementFor(rest('long', 10), rest('long', 10))).toBeNull();
  });

  it('reports the real time left when a tick was skipped, and speaks once for two milestones', () => {
    expect(announcementFor(rest('long', 50), rest('long', 70))).toBe('50 seconds left.');
    expect(announcementFor(rest('long', 8), rest('long', 70))).toBe('8 seconds left.');
  });

  it('does not announce a milestone a rest starts below', () => {
    expect(announcementFor(rest('long', 9), rest('long', 10))).toBeNull();
  });

  it('keeps milestones strictly inside a rest', () => {
    for (const milestones of Object.values(restMilestones)) {
      for (const milestone of milestones) expect(milestone).toBeGreaterThan(0);
    }
  });
});
