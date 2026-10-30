import type { ActionBus, ControlId, ControlRuntime, ControlState } from "../ui";

interface Notice {
  readonly controlId: ControlId;
  readonly message: string;
  /** The stable error code of a failure, for support; null for an expected refusal, which needs no reference. */
  readonly code: string | null;
}

/** The answers that leave nothing else on screen to say so: an action nobody handles yet, and one that failed and changed nothing. */
const NOTICE_STATES: ReadonlySet<ControlState> = new Set<ControlState>(["unavailable", "recoverable-error"]);

/**
 * The newest refusal or failure the bus gave to one of the watched controls. It reads the bus's
 * own control state, so one answer is one notice and activating again replaces it.
 */
export class ControlNotice {
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

  /** Returns every control that is showing an answer to ready, which also clears the notice. */
  dismiss(): void {
    for (const id of this.controlIds) {
      if (NOTICE_STATES.has(this.bus.getRuntime(id).state)) this.bus.reset(id);
    }
  }

  private readonly onBusChange = (): void => {
    let changed = false;
    for (const id of this.controlIds) {
      const runtime = this.bus.getRuntime(id);
      if (this.seen.get(id) === runtime) continue;
      this.seen.set(id, runtime);
      if (NOTICE_STATES.has(runtime.state) && runtime.message !== null) {
        this.current = { controlId: id, message: runtime.message, code: runtime.state === "recoverable-error" ? runtime.code : null };
        changed = true;
      } else if (this.current?.controlId === id) {
        this.current = null;
        changed = true;
      }
    }
    if (changed) for (const listener of [...this.listeners]) listener();
  };
}
