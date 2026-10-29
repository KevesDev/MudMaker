export type Politeness = "polite" | "assertive";

export interface Announcement {
  /** Changes on every announcement so a repeated sentence is still read out again. */
  readonly sequence: number;
  readonly text: string;
  readonly politeness: Politeness;
}

type Listener = () => void;

/** The single source of screen reader announcements; one live region renders it. */
export class Announcer {
  private last: Announcement | null = null;
  private sequence = 0;
  private readonly listeners = new Set<Listener>();

  announce(text: string, politeness: Politeness = "polite"): void {
    this.sequence += 1;
    this.last = Object.freeze({ sequence: this.sequence, text, politeness });
    for (const listener of [...this.listeners]) listener();
  }

  getLast(): Announcement | null {
    return this.last;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
