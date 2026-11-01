import { describe, expect, it, vi } from 'vitest';
import { DndService } from '../../src/main/dnd/dnd-service';

describe('DndService', () => {
  it('starts off, always: it is not remembered across launches', () => {
    expect(new DndService(() => undefined).get()).toBe(false);
  });

  it('set stores the switch and applies it to the scheduler', () => {
    const target = { setQuiet: vi.fn() };
    const service = new DndService(() => target);
    service.set(true);
    expect(service.get()).toBe(true);
    expect(target.setQuiet).toHaveBeenCalledWith(true);
    service.set(false);
    expect(target.setQuiet).toHaveBeenLastCalledWith(false);
  });

  it('setting the current value again applies nothing', () => {
    const target = { setQuiet: vi.fn() };
    const service = new DndService(() => target);
    service.set(false);
    service.set(true);
    service.set(true);
    expect(target.setQuiet).toHaveBeenCalledTimes(1);
  });

  it('keeps the switch when the scheduler does not exist yet', () => {
    const service = new DndService(() => undefined);
    expect(() => service.set(true)).not.toThrow();
    expect(service.get()).toBe(true);
  });

  it('reads the target when it is used, not when it is built', () => {
    let target: { setQuiet: ReturnType<typeof vi.fn> } | undefined;
    const service = new DndService(() => target);
    target = { setQuiet: vi.fn() };
    service.set(true);
    expect(target.setQuiet).toHaveBeenCalledWith(true);
  });
});
