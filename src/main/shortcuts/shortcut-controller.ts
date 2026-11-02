import type { Snapshot } from '../../core/scheduler';
import type { EngineEvent } from '../../core/state';
import { NO_SHORTCUT_HINTS, type ShortcutHints } from '../../shared/shortcuts';
import type { SnapshotSender } from '../scheduler-controller';
import { DEFAULT_ACCELERATORS, formatAccelerator, type Accelerators, type ShortcutAction } from './accelerators';
import type { ShortcutHintsOutput, ShortcutRegistrar, ShortcutTarget } from './ports';

export interface ShortcutControllerOptions {
  /** False turns the feature off: nothing is ever registered. Used where the OS cannot do it. */
  readonly enabled?: boolean;
  readonly accelerators?: Accelerators;
  readonly platform: NodeJS.Platform;
  readonly log?: (message: string) => void;
}

/**
 * Adapter on the scheduler's snapshot stream: owns the global Skip and Postpone shortcuts.
 *
 * - The keys are registered only while a rest is showing, and released the moment it ends (by
 *   completing, Skip, Postpone, Pause, or Do not disturb). For the rest of the day no other app
 *   loses them, and Skip and Postpone stay valid only during a rest, as the spec says. The engine
 *   still rejects both outside a rest, so a key pressed at the instant a rest ends does nothing.
 * - It follows the phase, not individual events, so a missed or repeated snapshot cannot leave a
 *   key registered. Repeated snapshots of the same phase do nothing.
 * - A key the OS refuses is logged and skipped; the other one still works. Hints go to the overlay
 *   only for keys that were accepted, so it never advertises a dead key.
 * - The shortcuts never take focus, so the overlay's focus policy (it never moves focus) holds.
 * It decides nothing about timing: the handlers call the controller, which calls the scheduler.
 */
export class ShortcutController implements SnapshotSender {
  private readonly enabled: boolean;
  private readonly accelerators: Accelerators;
  private registered: ShortcutAction[] = [];
  private active = false;

  constructor(
    private readonly registrar: ShortcutRegistrar,
    private readonly target: () => ShortcutTarget | undefined,
    private readonly output: ShortcutHintsOutput,
    private readonly options: ShortcutControllerOptions,
  ) {
    this.enabled = options.enabled ?? true;
    this.accelerators = options.accelerators ?? DEFAULT_ACCELERATORS;
    if (this.accelerators.skip === this.accelerators.postpone) {
      throw new RangeError('Skip and Postpone need different shortcuts');
    }
  }

  send(snapshot: Snapshot, _events?: readonly EngineEvent[]): void {
    const wanted = this.enabled && snapshot.state.phase === 'resting';
    if (wanted === this.active) return;
    if (wanted) this.activate();
    else this.deactivate();
  }

  /** Releases every key. Called when the app quits. */
  dispose(): void {
    if (this.active) this.deactivate();
  }

  private activate(): void {
    this.active = true;
    const hints: { skip: string | null; postpone: string | null } = { ...NO_SHORTCUT_HINTS };

    for (const action of ['skip', 'postpone'] as const) {
      const accelerator = this.accelerators[action];
      try {
        const accepted = this.registrar.register(accelerator, () => this.trigger(action));
        if (accepted) {
          this.registered.push(action);
          hints[action] = formatAccelerator(accelerator, this.options.platform);
        } else {
          this.options.log?.(`${accelerator} was refused by the OS; ${action} has no shortcut`);
        }
      } catch (error) {
        this.options.log?.(`could not register ${accelerator}: ${String(error)}`);
      }
    }
    this.announce(hints);
  }

  private deactivate(): void {
    this.active = false;
    for (const action of this.registered) {
      try {
        this.registrar.unregister(this.accelerators[action]);
      } catch (error) {
        this.options.log?.(`could not release ${this.accelerators[action]}: ${String(error)}`);
      }
    }
    this.registered = [];
    this.announce(NO_SHORTCUT_HINTS);
  }

  private trigger(action: ShortcutAction): void {
    const target = this.target();
    if (target === undefined) return;
    try {
      if (action === 'skip') target.skip();
      else target.postpone();
    } catch (error) {
      this.options.log?.(`${action} shortcut failed: ${String(error)}`);
    }
  }

  private announce(hints: ShortcutHints): void {
    try {
      this.output.push(hints);
    } catch (error) {
      this.options.log?.(`could not push shortcut hints: ${String(error)}`);
    }
  }
}
