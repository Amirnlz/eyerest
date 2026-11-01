import { describe, expect, it, vi } from 'vitest';
import { PreferencesStore } from '../../src/main/preferences/preferences-store';
import { createBroadcastThemeOutput } from '../../src/main/theme/theme-output';
import { ThemeService } from '../../src/main/theme/theme-service';
import type { WebContentsLike } from '../../src/main/snapshot-sender';
import { IPC } from '../../src/shared/ipc';
import type { ThemePreference } from '../../src/shared/theme';
import { FakeSettingsFs } from '../helpers/fake-lifecycle';

function setup(initial?: string) {
  const fs = new FakeSettingsFs();
  if (initial !== undefined) fs.files.set('/data/preferences.json', initial);
  const store = new PreferencesStore(fs, '/data/preferences.json');
  const pushed: ThemePreference[] = [];
  const service = new ThemeService(store, { push: (preference) => pushed.push(preference) });
  return { fs, store, service, pushed };
}

describe('ThemeService', () => {
  it('starts as System, or as the saved choice', () => {
    expect(setup().service.get()).toBe('system');
    expect(setup('{"theme":"dark"}').service.get()).toBe('dark');
  });

  it('set stores the choice, then tells every window', () => {
    const { service, store, pushed, fs } = setup();
    service.set('dark');
    expect(service.get()).toBe('dark');
    expect(store.get().theme).toBe('dark');
    expect(pushed).toEqual(['dark']);
    expect(fs.files.get('/data/preferences.json')).toContain('"theme": "dark"');
  });

  it('choosing the current value again writes and pushes nothing', () => {
    const { service, pushed, fs } = setup('{"theme":"light"}');
    service.set('light');
    expect(pushed).toEqual([]);
    expect(fs.ops).toEqual([]);
  });

  it('pushes every real change in order, including back to System', () => {
    const { service, pushed } = setup();
    service.set('dark');
    service.set('light');
    service.set('system');
    expect(pushed).toEqual(['dark', 'light', 'system']);
  });

  it('still pushes the new choice when the disk write fails, and keeps the sound choices', () => {
    const { service, fs, pushed, store } = setup('{"soundMuted":true}');
    fs.failOn = 'rename';
    service.set('dark');
    expect(pushed).toEqual(['dark']);
    expect(service.get()).toBe('dark');
    expect(store.get().sound.muted).toBe(true);
  });
});

describe('createBroadcastThemeOutput', () => {
  function target(options: { destroyed?: boolean; throws?: boolean } = {}) {
    const send = vi.fn((_channel: string, ..._args: unknown[]) => {
      if (options.throws) throw new Error('gone');
    });
    const web: WebContentsLike = { isDestroyed: () => options.destroyed ?? false, send };
    return { web, send };
  }

  it('pushes the choice on the theme channel to every live renderer', () => {
    const a = target();
    const b = target();
    createBroadcastThemeOutput(() => [a.web, b.web]).push('dark');
    expect(a.send).toHaveBeenCalledWith(IPC.theme.channel, 'dark');
    expect(b.send).toHaveBeenCalledWith(IPC.theme.channel, 'dark');
  });

  it('skips destroyed renderers', () => {
    const dead = target({ destroyed: true });
    createBroadcastThemeOutput(() => [dead.web]).push('light');
    expect(dead.send).not.toHaveBeenCalled();
  });

  it('reports a failing renderer and still reaches the others', () => {
    const bad = target({ throws: true });
    const good = target();
    const onError = vi.fn();
    createBroadcastThemeOutput(() => [bad.web, good.web], onError).push('system');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(good.send).toHaveBeenCalledTimes(1);
  });
});
