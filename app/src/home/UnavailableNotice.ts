import type { ActionBus, ControlId, ControlRuntime } from "../ui";

interface Notice {
  readonly controlId: ControlId;
  readonly message: string;
}

/**
 * The newest "not available" answer the bus gave to one of the watched controls. It reads the
 * bus's own control state, so one answer is one notice and activating again replaces it.
 */
export class UnavailableNotice {
  private current: Notice | null = null;
  private readonly seen = new Map<ControlId, ControlRuntime>();
  private readonly listeners = new Set<() => void>();
  private stopWatching: (() => void) | null = null;

  constructor(
    private readonly bus: ActionBus,
    private readonly controlIds: readonly ControlId[],
  ) {}

  /** Watches the bus only while something is listening, so an abandoned instance holds nothing. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    if (this.stopWatching === null) {
      this.stopWatching = this.bus.subscribe(this.onBusChange);
      this.onBusChange();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopWatching?.();
        this.stopWatching = null;
      }
    };
  };

  getSnapshot = (): Notice | null => this.current;

  /** Returns every control that is showing the answer to ready, which also clears the notice. */
  dismiss(): void {
    for (const id of this.controlIds) {
      if (this.bus.getRuntime(id).state === "unavailable") this.bus.reset(id);
    }
  }

  private readonly onBusChange = (): void => {
    let changed = false;
    for (const id of this.controlIds) {
      const runtime = this.bus.getRuntime(id);
      if (this.seen.get(id) === runtime) continue;
      this.seen.set(id, runtime);
      if (runtime.state === "unavailable" && runtime.message !== null) {
        this.current = { controlId: id, message: runtime.message };
        changed = true;
      } else if (this.current?.controlId === id) {
        this.current = null;
        changed = true;
      }
    }
    if (changed) for (const listener of [...this.listeners]) listener();
  };
}
