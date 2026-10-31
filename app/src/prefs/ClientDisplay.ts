type Listener = () => void;

export interface ClientDisplaySnapshot {
  readonly timestamps: boolean;
}

/** How the transcript is drawn, chosen under Settings in Play. The Play workspace and the Settings menu read the same value. */
export class ClientDisplay {
  private snapshot: ClientDisplaySnapshot = { timestamps: false };
  private readonly listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): ClientDisplaySnapshot => this.snapshot;

  setTimestamps(timestamps: boolean): void {
    if (timestamps === this.snapshot.timestamps) return;
    this.snapshot = { ...this.snapshot, timestamps };
    for (const listener of [...this.listeners]) listener();
  }
}

/** The one display setting set of this window. */
export const clientDisplay = new ClientDisplay();
