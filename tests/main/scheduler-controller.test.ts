import { describe, expect, it, vi } from 'vitest';
import type { Listener, Snapshot } from '../../src/core/scheduler';
import { SchedulerController, type SchedulerPort } from '../../src/main/scheduler-controller';
import { IDLE, WORKING, resting } from '../helpers/fake-api';

class FakeScheduler implements SchedulerPort {
  readonly calls: string[] = [];
  private readonly listeners = new Set<Listener>();
  snapshot: Snapshot = IDLE;

  start() {
    this.calls.push('start');
    this.emit(WORKING);
  }
  stop() {
    this.calls.push('stop');
    this.emit(IDLE);
  }
  skip() {
    this.calls.push('skip');
  }
  postpone() {
    this.calls.push('postpone');
  }
  getSnapshot() {
    return this.snapshot;
  }
  subscribe(listener: Listener) {
    this.calls.push('subscribe');
    this.listeners.add(listener);
    return () => {
      this.calls.push('unsubscribe');
      this.listeners.delete(listener);
    };
  }
  dispose() {
    this.calls.push('dispose');
  }
  emit(snapshot: Snapshot) {
    this.snapshot = snapshot;
    for (const listener of [...this.listeners]) listener(snapshot, []);
  }
}

function setup() {
  const scheduler = new FakeScheduler();
  const sender = { send: vi.fn() };
  const controller = new SchedulerController(scheduler, sender);
  return { scheduler, sender, controller };
}

describe('SchedulerController', () => {
  it('subscribes before starting so the first update is forwarded', () => {
    const { scheduler, sender, controller } = setup();
    controller.start();

    expect(scheduler.calls).toEqual(['subscribe', 'start']);
    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(sender.send).toHaveBeenCalledWith(WORKING);
  });

  it('forwards every later snapshot to the sender', () => {
    const { scheduler, sender, controller } = setup();
    controller.start();
    sender.send.mockClear();

    scheduler.emit(resting(20));
    scheduler.emit(resting(19));

    expect(sender.send).toHaveBeenCalledTimes(2);
    expect(sender.send).toHaveBeenLastCalledWith(resting(19));
  });

  it('start() twice does not subscribe or start twice', () => {
    const { scheduler, controller } = setup();
    controller.start();
    controller.start();
    expect(scheduler.calls).toEqual(['subscribe', 'start']);
  });

  it('delegates getSnapshot, skip and postpone to the scheduler', () => {
    const { scheduler, controller } = setup();
    scheduler.snapshot = resting(7);

    expect(controller.getSnapshot()).toBe(scheduler.snapshot);
    controller.skip();
    controller.postpone();

    expect(scheduler.calls).toEqual(['skip', 'postpone']);
  });

  it('pause stops the scheduler and forwards the idle snapshot', () => {
    const { scheduler, sender, controller } = setup();
    controller.start();
    sender.send.mockClear();

    controller.pause();

    expect(scheduler.calls.slice(-1)).toEqual(['stop']);
    expect(sender.send).toHaveBeenCalledWith(IDLE);
  });

  it('resume starts the scheduler again without subscribing twice', () => {
    const { scheduler, sender, controller } = setup();
    controller.start();
    controller.pause();
    sender.send.mockClear();

    controller.resume();

    expect(scheduler.calls).toEqual(['subscribe', 'start', 'stop', 'start']);
    expect(sender.send).toHaveBeenCalledWith(WORKING);
  });

  it('dispose unsubscribes, disposes the scheduler and stops forwarding', () => {
    const { scheduler, sender, controller } = setup();
    controller.start();
    sender.send.mockClear();

    controller.dispose();
    scheduler.emit(resting(5));

    expect(scheduler.calls.slice(-2)).toEqual(['unsubscribe', 'dispose']);
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('dispose without start is safe', () => {
    const { scheduler, controller } = setup();
    expect(() => controller.dispose()).not.toThrow();
    expect(scheduler.calls).toEqual(['dispose']);
  });
});
