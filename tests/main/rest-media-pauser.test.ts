import { describe, expect, it, vi } from 'vitest';
import { RestMediaPauser } from '../../src/main/media/rest-media-pauser';
import { IDLE, WORKING, resting, warning } from '../helpers/fake-api';
import { FakeMediaController } from '../helpers/fake-media';

function setup() {
  const controller = new FakeMediaController();
  const onError = vi.fn();
  const log = vi.fn();
  const pauser = new RestMediaPauser(controller, { onError, log });
  return { controller, onError, log, pauser };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('RestMediaPauser', () => {
  it('does nothing while idle, working and during the warning', () => {
    const { controller, pauser } = setup();
    pauser.send(IDLE);
    pauser.send(WORKING);
    pauser.send(warning(15));
    pauser.send(warning(1));
    expect(controller.calls).toBe(0);
  });

  it('pauses once when the rest starts', () => {
    const { controller, pauser } = setup();
    pauser.send(warning(1));
    pauser.send(resting(20));
    expect(controller.calls).toBe(1);
  });

  it('does not pause again on later ticks of the same rest', () => {
    const { controller, pauser } = setup();
    pauser.send(resting(20));
    pauser.send(resting(19));
    pauser.send(resting(18));
    expect(controller.calls).toBe(1);
  });

  it('pauses once per rest across several rests', () => {
    const { controller, pauser } = setup();
    pauser.send(resting(20));
    pauser.send(WORKING);
    pauser.send(warning(10));
    pauser.send(resting(20, 'long'));
    expect(controller.calls).toBe(2);
  });

  it('does not pause when a rest ends by skip or postpone (back to working)', () => {
    const { controller, pauser } = setup();
    pauser.send(resting(20));
    pauser.send(WORKING);
    pauser.send(WORKING);
    expect(controller.calls).toBe(1);
  });

  it('pauses when the very first snapshot is already a rest', () => {
    const { controller, pauser } = setup();
    pauser.send(resting(20));
    expect(controller.calls).toBe(1);
  });

  it('logs how many players were paused', async () => {
    const { controller, log, pauser } = setup();
    controller.result = { players: ['a', 'b'] };
    pauser.send(resting(20));
    await flush();
    expect(log).toHaveBeenCalledWith('paused 2 player(s)');
  });

  it('logs zero when nothing was playing', async () => {
    const { log, pauser } = setup();
    pauser.send(resting(20));
    await flush();
    expect(log).toHaveBeenCalledWith('paused 0 player(s)');
  });

  it('reports a rejected pause and does not throw', async () => {
    const { controller, onError, pauser } = setup();
    controller.rejectWith = new Error('bus down');
    expect(() => pauser.send(resting(20))).not.toThrow();
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports a synchronous throw and does not throw', () => {
    const { controller, onError, pauser } = setup();
    controller.throwWith = new Error('boom');
    expect(() => pauser.send(resting(20))).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('keeps working after a failure: the next rest pauses again', async () => {
    const { controller, pauser } = setup();
    controller.rejectWith = new Error('bus down');
    pauser.send(resting(20));
    await flush();
    pauser.send(WORKING);
    controller.rejectWith = undefined;
    pauser.send(resting(20));
    expect(controller.calls).toBe(2);
  });
});
