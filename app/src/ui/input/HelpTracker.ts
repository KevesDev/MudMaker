type Listener = () => void;

/**
 * Decides which control's help is showing. Hover, keyboard focus and an explicit help request
 * (F1, long press, or pressing a disabled control) all feed the same state, so help is never
 * hover-only and Escape can dismiss it without moving focus.
 */
export class HelpTracker {
  private hovered: string | null = null;
  private focused: string | null = null;
  private pinned: string | null = null;
  private dismissed: string | null = null;
  private readonly listeners = new Set<Listener>();

  current(): string | null {
    const shown = this.pinned ?? this.hovered ?? this.focused;
    return shown !== null && shown === this.dismissed ? null : shown;
  }

  isShown(controlId: string): boolean {
    return this.current() === controlId;
  }

  setHovered(controlId: string | null): void {
    this.update(() => {
      this.hovered = controlId;
    });
  }

  setFocused(controlId: string | null): void {
    this.update(() => {
      this.focused = controlId;
      if (controlId === null) this.pinned = null;
    });
  }

  pin(controlId: string): void {
    this.update(() => {
      this.pinned = controlId;
      this.dismissed = null;
    });
  }

  unpin(): void {
    this.update(() => {
      this.pinned = null;
    });
  }

  /** Hides the showing help until a different control takes it; returns whether anything was showing. */
  dismiss(): boolean {
    const shown = this.current();
    if (shown === null) return false;
    this.update(() => {
      this.dismissed = shown;
      this.pinned = null;
    });
    return true;
  }

  clear(): void {
    this.update(() => {
      this.hovered = null;
      this.focused = null;
      this.pinned = null;
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private update(change: () => void): void {
    const before = this.current();
    change();
    if (this.dismissed !== null && this.dismissed !== this.hovered && this.dismissed !== this.focused) this.dismissed = null;
    if (this.current() === before) return;
    for (const listener of [...this.listeners]) listener();
  }
}
