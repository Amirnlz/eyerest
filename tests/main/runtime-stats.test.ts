import { describe, expect, it } from 'vitest';
import { dayKey } from '../../src/core/stats';
import { createMainRuntime } from '../../src/main/runtime';
import { StatsRecorder } from '../../src/main/stats/stats-recorder';
import { StatsStore } from '../../src/main/stats/stats-store';
import { IPC } from '../../src/shared/ipc';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeSettingsFs } from '../helpers/fake-lifecycle';
import { FakeTime } from '../helpers/fake-time';

const SEC = 1_000;
const START = new Date(2026, 10, 2, 10, 0, 0).getTime();

/** Fast mode: work 20 s, rest due at 20 s and lasting 5 s, long rest 10 s, postpone 10 s. */
function setup() {
  const time = new FakeTime();
  time.jump(START);
  const fs = new FakeSettingsFs();
  const store = new StatsStore(fs, '/data/stats.json');
  const ipc = createFakeIpcMain();
  const runtime = createMainRuntime({
    env: { EYEREST_FAST: '1' },
    ipcMain: ipc,
    getTargets: () => [],
    extraSenders: [new StatsRecorder(store, time)],
    getStats: () => store.recent(time.now(), 7),
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
  });
  runtime.start();
  const today = () => (ipc.invoke(IPC.getStats.channel) as ReturnType<typeof store.recent>)[0];
  return { time, runtime, ipc, today, fs, advance: (seconds: number) => time.advance(seconds * SEC) };
}

describe('statistics through the runtime', () => {
  it('counts a rest that ran out as taken', () => {
    const { advance, today } = setup();
    advance(20);
    expect(today()).toMatchObject({ taken: 0 });
    advance(5);
    expect(today()).toEqual({ date: dayKey(START), taken: 1, skipped: 0, postponed: 0 });
  });

  it('counts Skip and Postpone, and not the rest start or the warning', () => {
    const { advance, today, runtime } = setup();
    advance(20); // rest 1 starts
    runtime.controller.skip();
    expect(today()).toMatchObject({ taken: 0, skipped: 1, postponed: 0 });

    advance(20); // rest 2 starts
    runtime.controller.postpone();
    expect(today()).toMatchObject({ taken: 0, skipped: 1, postponed: 1 });
  });

  it('counts every Postpone, including repeats of the same rest', () => {
    const { advance, today, runtime } = setup();
    advance(20);
    runtime.controller.postpone();
    advance(10);
    runtime.controller.postpone();
    expect(today()).toMatchObject({ postponed: 2 });
  });

  it('counts rests swallowed by do not disturb as skipped', () => {
    const { advance, today, runtime } = setup();
    runtime.controller.setQuiet(true);
    advance(20);
    expect(today()).toMatchObject({ taken: 0, skipped: 1 });
  });

  it('counts a rest ended by turning do not disturb on as skipped', () => {
    const { advance, today, runtime } = setup();
    advance(20);
    runtime.controller.setQuiet(true);
    expect(today()).toMatchObject({ skipped: 1 });
  });

  it('does not count a rest cut short by Pause', () => {
    const { advance, today, runtime } = setup();
    advance(20);
    runtime.controller.pause();
    expect(today()).toEqual({ date: dayKey(START), taken: 0, skipped: 0, postponed: 0 });
  });

  it('answers with seven days, today first, and writes the file as outcomes happen', () => {
    const { advance, ipc, fs, runtime } = setup();
    advance(20);
    runtime.controller.skip();

    const days = ipc.invoke(IPC.getStats.channel) as { date: string }[];
    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe('2026-11-02');
    expect(days[6]?.date).toBe('2026-10-27');
    expect(JSON.parse(fs.files.get('/data/stats.json') ?? '{}')).toEqual({
      version: 1,
      days: { '2026-11-02': { taken: 0, skipped: 1, postponed: 0 } },
    });
  });

  it('answers an empty list when no statistics source is configured', () => {
    const ipc = createFakeIpcMain();
    createMainRuntime({ env: {}, ipcMain: ipc, getTargets: () => [] });
    expect(ipc.invoke(IPC.getStats.channel)).toEqual([]);
  });
});
