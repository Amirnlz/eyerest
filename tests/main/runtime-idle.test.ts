import { describe, expect, it } from 'vitest';
import { createMainRuntime } from '../../src/main/runtime';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeTime } from '../helpers/fake-time';

const SEC = 1_000;

/**
 * Fast mode: work 20 s, warning from 15 s, rest 5 s, long rest 10 s, postpone 10 s, and the
 * idle threshold drops to 3 s. The idle poll uses its own fake ticker (a fake holds one callback).
 */
function setup(options: { idle?: boolean; env?: Record<string, string> } = {}) {
  const time = new FakeTime();
  const idleTicker = new FakeTime();
  let idleSeconds = 0;
  const snapshots: string[] = [];

  const runtime = createMainRuntime({
    env: { EYEREST_FAST: '1', ...options.env },
    ipcMain: createFakeIpcMain(),
    getTargets: () => [],
    extraSenders: [{ send: (snapshot) => snapshots.push(snapshot.state.phase) }],
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
    idle:
      options.idle === false
        ? undefined
        : { source: { getIdleMs: () => idleSeconds * SEC }, ticker: idleTicker },
  });
  runtime.start();

  return {
    time,
    idleTicker,
    runtime,
    snapshots,
    phase: () => runtime.controller.getSnapshot().state.phase,
    /** Moves the clock, with the idle monitor polling once per second like the app. */
    pass: (seconds: number) => {
      for (let i = 0; i < seconds; i++) {
        time.advance(SEC);
        idleTicker.advance(SEC);
      }
    },
    setIdleSeconds: (value: number) => {
      idleSeconds = value;
    },
  };
}

describe('idle detection through the runtime', () => {
  it('freezes the work countdown when idle passes the fast-mode threshold of 3 s', () => {
    const { pass, setIdleSeconds, phase, snapshots } = setup();
    pass(5);
    setIdleSeconds(3);
    pass(1);
    expect(phase()).toBe('away');
    expect(snapshots.at(-1)).toBe('away');
  });

  it('stays away through what would have been the rest time', () => {
    const { pass, setIdleSeconds, phase } = setup();
    pass(5);
    setIdleSeconds(4);
    pass(60);
    expect(phase()).toBe('away');
  });

  it('resumes the remaining time after a short absence', () => {
    const { pass, setIdleSeconds, phase, runtime } = setup();
    pass(5);
    setIdleSeconds(3);
    pass(2); // away; last input was 3 s before it was noticed
    setIdleSeconds(0);
    pass(1); // back
    expect(phase()).toBe('working');
    const state = runtime.controller.getSnapshot().state;
    expect(state.phase === 'working' && state.restsDone).toBe(0);
  });

  it('resets after an absence as long as the long rest (10 s in fast mode)', () => {
    const { pass, setIdleSeconds, runtime } = setup();
    pass(5);
    setIdleSeconds(3);
    pass(14);
    setIdleSeconds(0);
    pass(1);
    const state = runtime.controller.getSnapshot().state;
    expect(state.phase).toBe('working');
    expect(state.phase === 'working' && state.restsDone).toBe(1);
  });

  it('never interrupts a rest in progress', () => {
    const { pass, setIdleSeconds, phase } = setup();
    pass(20); // rest starts
    expect(phase()).toBe('resting');
    setIdleSeconds(10);
    pass(1);
    expect(phase()).toBe('resting');
  });

  it('does nothing while paused', () => {
    const { pass, setIdleSeconds, phase, runtime } = setup();
    runtime.controller.pause();
    setIdleSeconds(30);
    pass(5);
    expect(phase()).toBe('idle');
  });

  it('Pause while away goes idle, and Resume starts a fresh cycle', () => {
    const { pass, setIdleSeconds, phase, runtime } = setup();
    pass(5);
    setIdleSeconds(4);
    pass(1);
    expect(phase()).toBe('away');

    runtime.controller.pause();
    expect(phase()).toBe('idle');

    setIdleSeconds(0);
    runtime.controller.resume();
    expect(phase()).toBe('working');
  });

  it('uses the one minute threshold outside fast mode', () => {
    const { pass, setIdleSeconds, phase } = setup({ env: { EYEREST_FAST: '0' } });
    setIdleSeconds(59);
    pass(1);
    expect(phase()).toBe('working');
    setIdleSeconds(60);
    pass(1);
    expect(phase()).toBe('away');
  });

  it('EYEREST_IDLE=0 turns the monitor off even with a source', () => {
    const { pass, setIdleSeconds, phase, idleTicker } = setup({ env: { EYEREST_IDLE: '0' } });
    expect(idleTicker.activeTickers).toBe(0);
    setIdleSeconds(600);
    pass(5);
    expect(phase()).toBe('working');
  });

  it('without an idle source nothing is monitored', () => {
    const { pass, phase } = setup({ idle: false });
    pass(5);
    expect(phase()).toBe('working');
  });

  it('polls from start and stops polling on dispose', () => {
    const { idleTicker, runtime } = setup();
    expect(idleTicker.activeTickers).toBe(1);
    runtime.dispose();
    expect(idleTicker.activeTickers).toBe(0);
  });
});
