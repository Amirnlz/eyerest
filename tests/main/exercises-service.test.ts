import { describe, expect, it, vi } from 'vitest';
import { createBroadcastExercisesOutput } from '../../src/main/exercises/exercises-output';
import { ExercisesService } from '../../src/main/exercises/exercises-service';
import { PreferencesStore } from '../../src/main/preferences/preferences-store';
import type { WebContentsLike } from '../../src/main/snapshot-sender';
import { IPC } from '../../src/shared/ipc';
import { FakeSettingsFs } from '../helpers/fake-lifecycle';

function setup(initial?: string) {
  const fs = new FakeSettingsFs();
  if (initial !== undefined) fs.files.set('/data/preferences.json', initial);
  const store = new PreferencesStore(fs, '/data/preferences.json');
  const pushed: boolean[] = [];
  const service = new ExercisesService(store, { push: (enabled) => pushed.push(enabled) });
  return { fs, store, service, pushed };
}

describe('ExercisesService', () => {
  it('starts on, or as saved', () => {
    expect(setup().service.get()).toBe(true);
    expect(setup('{"exercises":false}').service.get()).toBe(false);
  });

  it('set stores the choice, then tells every window', () => {
    const { service, store, pushed, fs } = setup();
    service.set(false);
    expect(service.get()).toBe(false);
    expect(store.get().exercises).toBe(false);
    expect(pushed).toEqual([false]);
    expect(fs.files.get('/data/preferences.json')).toContain('"exercises": false');
  });

  it('setting the current value again writes and pushes nothing', () => {
    const { service, pushed, fs } = setup('{"exercises":false}');
    service.set(false);
    expect(pushed).toEqual([]);
    expect(fs.ops).toEqual([]);
  });

  it('pushes every real change in order', () => {
    const { service, pushed } = setup();
    service.set(false);
    service.set(true);
    service.set(false);
    expect(pushed).toEqual([false, true, false]);
  });

  it('still pushes when the disk write fails, and keeps the other choices', () => {
    const { service, fs, pushed, store } = setup('{"theme":"dark"}');
    fs.failOn = 'rename';
    service.set(false);
    expect(pushed).toEqual([false]);
    expect(service.get()).toBe(false);
    expect(store.get().theme).toBe('dark');
  });
});

describe('createBroadcastExercisesOutput', () => {
  function target(options: { destroyed?: boolean; throws?: boolean } = {}) {
    const send = vi.fn((_channel: string, ..._args: unknown[]) => {
      if (options.throws) throw new Error('gone');
    });
    const web: WebContentsLike = { isDestroyed: () => options.destroyed ?? false, send };
    return { web, send };
  }

  it('pushes the boolean on the exercises channel to every live renderer', () => {
    const a = target();
    const b = target();
    createBroadcastExercisesOutput(() => [a.web, b.web]).push(false);
    expect(a.send).toHaveBeenCalledWith(IPC.exercises.channel, false);
    expect(b.send).toHaveBeenCalledWith(IPC.exercises.channel, false);
  });

  it('skips destroyed renderers', () => {
    const dead = target({ destroyed: true });
    createBroadcastExercisesOutput(() => [dead.web]).push(true);
    expect(dead.send).not.toHaveBeenCalled();
  });

  it('reports a failing renderer and still reaches the others', () => {
    const bad = target({ throws: true });
    const good = target();
    const onError = vi.fn();
    createBroadcastExercisesOutput(() => [bad.web, good.web], onError).push(true);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(good.send).toHaveBeenCalledTimes(1);
  });
});
