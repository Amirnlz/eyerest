import { describe, expect, it, vi } from 'vitest';
import {
  createBroadcastSender,
  createCompositeSender,
  type WebContentsLike,
} from '../../src/main/snapshot-sender';
import { IPC } from '../../src/shared/ipc';
import { WORKING } from '../helpers/fake-api';

function fakeTarget(options: { destroyed?: boolean; throws?: boolean } = {}) {
  const send = vi.fn((_channel: string, ..._args: unknown[]) => {
    if (options.throws) throw new Error('renderer crashed');
  });
  const target: WebContentsLike = { isDestroyed: () => options.destroyed ?? false, send };
  return { target, send };
}

describe('createBroadcastSender', () => {
  it('sends the snapshot on the snapshot channel to every live target', () => {
    const a = fakeTarget();
    const b = fakeTarget();
    const sender = createBroadcastSender(() => [a.target, b.target]);

    sender.send(WORKING);

    expect(a.send).toHaveBeenCalledWith(IPC.snapshot.channel, WORKING);
    expect(b.send).toHaveBeenCalledWith(IPC.snapshot.channel, WORKING);
  });

  it('skips destroyed targets', () => {
    const live = fakeTarget();
    const dead = fakeTarget({ destroyed: true });
    createBroadcastSender(() => [dead.target, live.target]).send(WORKING);

    expect(dead.send).not.toHaveBeenCalled();
    expect(live.send).toHaveBeenCalledTimes(1);
  });

  it('keeps going and reports the error when one target throws', () => {
    const broken = fakeTarget({ throws: true });
    const healthy = fakeTarget();
    const onError = vi.fn();

    createBroadcastSender(() => [broken.target, healthy.target], onError).send(WORKING);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(healthy.send).toHaveBeenCalledTimes(1);
  });

  it('reads the target list at send time, so new windows receive updates', () => {
    const targets: WebContentsLike[] = [];
    const sender = createBroadcastSender(() => targets);

    sender.send(WORKING);
    const late = fakeTarget();
    targets.push(late.target);
    sender.send(WORKING);

    expect(late.send).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there are no windows', () => {
    expect(() => createBroadcastSender(() => []).send(WORKING)).not.toThrow();
  });
});

describe('createCompositeSender', () => {
  it('forwards each snapshot to every sender in order', () => {
    const order: string[] = [];
    const composite = createCompositeSender([
      { send: () => order.push('a') },
      { send: () => order.push('b') },
    ]);

    composite.send(WORKING);

    expect(order).toEqual(['a', 'b']);
  });

  it('keeps going and reports the error when one sender throws', () => {
    const onError = vi.fn();
    const after = vi.fn();
    const composite = createCompositeSender(
      [
        {
          send: () => {
            throw new Error('overlay failed');
          },
        },
        { send: after },
      ],
      onError,
    );

    expect(() => composite.send(WORKING)).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledWith(WORKING);
  });

  it('does nothing with no senders', () => {
    expect(() => createCompositeSender([]).send(WORKING)).not.toThrow();
  });
});
