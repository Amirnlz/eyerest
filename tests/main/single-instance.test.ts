import { describe, expect, it } from 'vitest';
import { acquireSingleInstance } from '../../src/main/single-instance';

function fakeApp(lock: boolean) {
  const calls: string[] = [];
  return {
    calls,
    requestSingleInstanceLock() {
      calls.push('lock');
      return lock;
    },
    quit() {
      calls.push('quit');
    },
  };
}

describe('acquireSingleInstance', () => {
  it('the first instance gets the lock and keeps running', () => {
    const app = fakeApp(true);
    expect(acquireSingleInstance(app)).toBe(true);
    expect(app.calls).toEqual(['lock']);
  });

  it('a second instance does not get the lock and quits', () => {
    const app = fakeApp(false);
    expect(acquireSingleInstance(app)).toBe(false);
    expect(app.calls).toEqual(['lock', 'quit']);
  });
});
