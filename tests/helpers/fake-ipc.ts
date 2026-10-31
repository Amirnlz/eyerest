import type { IpcMainLike, IpcRendererLike } from '../../src/shared/ipc';

export interface FakeIpcMain extends IpcMainLike {
  readonly handlers: Map<string, (event: unknown, ...args: unknown[]) => unknown>;
  readonly listeners: Map<string, () => void>;
  /** Simulates `ipcRenderer.invoke(channel, ...args)`. Like Electron, passes an event first. */
  invoke(channel: string, ...args: unknown[]): unknown;
  /** Simulates `ipcRenderer.send(channel)`. */
  emit(channel: string): void;
}

export function createFakeIpcMain(): FakeIpcMain {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  const listeners = new Map<string, () => void>();

  return {
    handlers,
    listeners,
    handle: (channel, listener) => {
      handlers.set(channel, listener);
    },
    on: (channel, listener) => {
      listeners.set(channel, listener);
    },
    removeHandler: (channel) => {
      handlers.delete(channel);
    },
    removeListener: (channel, listener) => {
      if (listeners.get(channel) === listener) listeners.delete(channel);
    },
    invoke: (channel, ...args) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return handler({ fakeEvent: true }, ...args);
    },
    emit: (channel) => {
      const listener = listeners.get(channel);
      if (!listener) throw new Error(`No listener for ${channel}`);
      listener();
    },
  };
}

export interface FakeIpcRenderer extends IpcRendererLike {
  /** Every channel the bridge touched, in order. */
  readonly touched: string[];
  readonly invoked: string[];
  /** The arguments of each `invoke`, parallel to `invoked`. */
  readonly invokedArgs: unknown[][];
  readonly sent: string[];
  /** Simulates main pushing a payload on a channel. */
  push(channel: string, payload: unknown): void;
  listenerCount(channel: string): number;
}

export function createFakeIpcRenderer(invokeResult: unknown = undefined): FakeIpcRenderer {
  const touched: string[] = [];
  const invoked: string[] = [];
  const invokedArgs: unknown[][] = [];
  const sent: string[] = [];
  const listeners = new Map<string, Set<(event: unknown, ...args: unknown[]) => void>>();

  return {
    touched,
    invoked,
    invokedArgs,
    sent,
    invoke: (channel, ...args) => {
      touched.push(channel);
      invoked.push(channel);
      invokedArgs.push(args);
      return Promise.resolve(invokeResult);
    },
    send: (channel) => {
      touched.push(channel);
      sent.push(channel);
    },
    on: (channel, listener) => {
      touched.push(channel);
      const set = listeners.get(channel) ?? new Set();
      set.add(listener);
      listeners.set(channel, set);
    },
    removeListener: (channel, listener) => {
      listeners.get(channel)?.delete(listener);
    },
    push: (channel, payload) => {
      for (const listener of listeners.get(channel) ?? []) listener({ fakeEvent: true }, payload);
    },
    listenerCount: (channel) => listeners.get(channel)?.size ?? 0,
  };
}
