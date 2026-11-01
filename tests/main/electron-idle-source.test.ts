import { describe, expect, it } from 'vitest';
import { createElectronIdleSource } from '../../src/main/idle/electron-idle-source';

describe('createElectronIdleSource', () => {
  it('converts the whole seconds Electron reports to milliseconds', () => {
    const source = createElectronIdleSource({ getSystemIdleTime: () => 75 });
    expect(source.getIdleMs()).toBe(75_000);
  });

  it('reads fresh each time', () => {
    let seconds = 0;
    const source = createElectronIdleSource({ getSystemIdleTime: () => seconds });
    expect(source.getIdleMs()).toBe(0);
    seconds = 3;
    expect(source.getIdleMs()).toBe(3_000);
  });

  it('lets a throwing power monitor propagate, for the monitor to log', () => {
    const source = createElectronIdleSource({
      getSystemIdleTime: () => {
        throw new Error('unsupported');
      },
    });
    expect(() => source.getIdleMs()).toThrow('unsupported');
  });
});
