import { describe, expect, it, vi } from 'vitest';
import { RestMediaPauser } from '../../src/main/media/rest-media-pauser';
import { createMainRuntime } from '../../src/main/runtime';
import { IPC } from '../../src/shared/ipc';
import { FakeMediaController } from '../helpers/fake-media';
import { createFakeIpcMain } from '../helpers/fake-ipc';
import { FakeTime } from '../helpers/fake-time';

const SEC = 1_000;

/** Fast mode: work 20 s, warning from 15 s, rest 5 s, postpone 10 s. */
function setup() {
  const time = new FakeTime();
  const ipcMain = createFakeIpcMain();
  const controller = new FakeMediaController();
  const onError = vi.fn();
  const runtime = createMainRuntime({
    env: { EYEREST_FAST: '1' },
    ipcMain,
    getTargets: () => [],
    extraSenders: [new RestMediaPauser(controller, { onError })],
    schedulerOptions: { clock: time, ticker: time, tickIntervalMs: 250 },
  });
  runtime.start();
  return { time, ipcMain, controller, onError, runtime };
}

describe('runtime + media pauser', () => {
  it('does not pause while working or during the warning', () => {
    const { time, controller } = setup();
    time.advance(19 * SEC);
    expect(controller.calls).toBe(0);
  });

  it('pauses once when the rest starts', () => {
    const { time, controller } = setup();
    time.advance(20 * SEC);
    expect(controller.calls).toBe(1);
    time.advance(4 * SEC);
    expect(controller.calls).toBe(1);
  });

  it('does not pause again when the rest ends', () => {
    const { time, controller } = setup();
    time.advance(30 * SEC);
    expect(controller.calls).toBe(1);
  });

  it('does not pause on skip or postpone, only at the next rest start', () => {
    const { time, ipcMain, controller } = setup();
    time.advance(20 * SEC);
    ipcMain.emit(IPC.postpone.channel);
    expect(controller.calls).toBe(1);

    time.advance(10 * SEC);
    expect(controller.calls).toBe(2);

    ipcMain.emit(IPC.skip.channel);
    expect(controller.calls).toBe(2);
  });

  it('a failing controller never breaks the rest', async () => {
    const { time, controller, onError, runtime } = setup();
    controller.rejectWith = new Error('bus down');
    time.advance(20 * SEC);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(runtime.controller.getSnapshot().state.phase).toBe('resting');
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
