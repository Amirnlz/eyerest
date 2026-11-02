import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE, type WorkSchedule } from '../../src/core/schedule';
import { createMainRuntime } from '../../src/main/runtime';
import { IPC } from '../../src/shared/ipc';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeTime } from '../helpers/fake-time';

const SEC = 1_000;
const MINUTE = 60_000;

const office: WorkSchedule = {
  enabled: true,
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 17 * 60,
};

/**
 * The scheduler runs on a fake clock that starts at 0, so the gate reads a local time near the
 * epoch. Instead the fake clock is moved to a chosen local time with `jumpTo`.
 */
function setup(options: { schedule?: WorkSchedule; startAt: number }) {
  const time = new FakeTime();
  const gateTicker = new FakeTime();
  const ipc = createFakeIpcMain();
  let stored = options.schedule ?? DEFAULT_SCHEDULE;
  const phases: string[] = [];

  time.jump(options.startAt);
  const runtime = createMainRuntime({
    env: { EYEREST_FAST: '1' },
    ipcMain: ipc,
    getTargets: () => [],
    extraSenders: [{ send: (snapshot) => phases.push(snapshot.state.phase) }],
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
    schedule: {
      prefs: {
        get: () => stored,
        set: (next) => {
          stored = next;
        },
      },
      ticker: gateTicker,
    },
  });
  runtime.start();

  return {
    time,
    ipc,
    phases,
    runtime,
    phase: () => runtime.controller.getSnapshot().state.phase,
    stored: () => stored,
    /** Moves the clock, with the gate polling once per minute like the app. */
    pass: (ms: number) => {
      const steps = Math.ceil(ms / SEC);
      for (let i = 0; i < steps; i++) {
        time.advance(SEC);
        if ((i + 1) % 60 === 0) gateTicker.advance(MINUTE);
      }
    },
    gateTicker,
  };
}

const MONDAY_10 = new Date(2026, 10, 2, 10, 0).getTime();
const MONDAY_16_59 = new Date(2026, 10, 2, 16, 59).getTime();
const MONDAY_20 = new Date(2026, 10, 2, 20, 0).getTime();

describe('working hours through the runtime', () => {
  it('behaves as before when no schedule is configured', () => {
    const time = new FakeTime();
    const runtime = createMainRuntime({
      env: { EYEREST_FAST: '1' },
      ipcMain: createFakeIpcMain(),
      getTargets: () => [],
      schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
    });
    runtime.start();
    expect(runtime.controller.getSnapshot().state.phase).toBe('working');
  });

  it('runs reminders inside the window', () => {
    const { phase } = setup({ schedule: office, startAt: MONDAY_10 });
    expect(phase()).toBe('working');
  });

  it('starts paused when the app opens outside the window, and shows no rest', () => {
    const { phase, pass, phases } = setup({ schedule: office, startAt: MONDAY_20 });
    expect(phase()).toBe('idle');
    pass(60 * SEC);
    expect(phase()).toBe('idle');
    expect(phases).not.toContain('warning');
    expect(phases).not.toContain('resting');
  });

  it('pauses from any phase when the window closes, and starts no further rest', () => {
    const { time, phase, pass } = setup({ schedule: office, startAt: MONDAY_16_59 });
    pass(15 * SEC);
    expect(['warning', 'resting']).toContain(phase());
    // Move across 17:00: the next poll pauses.
    time.jump(new Date(2026, 10, 2, 17, 0).getTime());
    pass(60 * SEC);
    expect(phase()).toBe('idle');
  });

  it('resumes with a fresh work interval when the next window opens', () => {
    const { time, phase, pass, runtime } = setup({ schedule: office, startAt: MONDAY_20 });
    expect(phase()).toBe('idle');
    time.jump(new Date(2026, 10, 3, 9, 0).getTime());
    pass(60 * SEC);
    expect(phase()).toBe('working');
    expect(runtime.controller.getSnapshot().secondsRemaining).toBeNull();
  });

  describe('IPC', () => {
    it('answers getSchedule with the stored schedule', () => {
      const { ipc } = setup({ schedule: office, startAt: MONDAY_10 });
      expect(ipc.invoke(IPC.getSchedule.channel)).toEqual(office);
    });

    it('answers the default schedule when no storage is configured', () => {
      const ipc = createFakeIpcMain();
      createMainRuntime({ env: {}, ipcMain: ipc, getTargets: () => [] });
      expect(ipc.invoke(IPC.getSchedule.channel)).toEqual(DEFAULT_SCHEDULE);
      expect(ipc.invoke(IPC.saveSchedule.channel, office)).toMatchObject({ ok: false });
    });

    it('saves a valid schedule and applies it at once: now outside, so reminders pause', () => {
      const { ipc, phase, stored } = setup({
        schedule: { ...office, enabled: false },
        startAt: MONDAY_10,
      });
      expect(phase()).toBe('working');

      const result = ipc.invoke(IPC.saveSchedule.channel, { ...office, startMinute: 11 * 60 });

      expect(result).toMatchObject({ ok: true });
      expect(stored().startMinute).toBe(11 * 60);
      expect(phase()).toBe('idle');
    });

    it('turning the schedule off resumes what the gate paused', () => {
      const { ipc, phase } = setup({ schedule: office, startAt: MONDAY_20 });
      expect(phase()).toBe('idle');
      ipc.invoke(IPC.saveSchedule.channel, { ...office, enabled: false });
      expect(phase()).toBe('working');
    });

    it('rejects an invalid payload sent over IPC and changes nothing', () => {
      const { ipc, phase, stored } = setup({ schedule: office, startAt: MONDAY_10 });
      const result = ipc.invoke(IPC.saveSchedule.channel, { ...office, days: [] });
      expect(result).toMatchObject({ ok: false });
      expect(stored()).toEqual(office);
      expect(phase()).toBe('working');
    });
  });

  it('stops its ticker on dispose', () => {
    const { runtime, gateTicker } = setup({ schedule: office, startAt: MONDAY_10 });
    expect(gateTicker.activeTickers).toBe(1);
    runtime.dispose();
    expect(gateTicker.activeTickers).toBe(0);
  });
});
