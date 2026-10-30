type Listener = () => void;

/**
 * Decides which control's help is showing. Hover, keyboard focus and an explicit help request
 * (F1, long press, or pressing a disabled control) all feed the same state, so help is never
 * hover-only and Escape can dismiss it without moving focus. Each tooltip registers its key while
 * it has content; the shown help is the first of pinned, hovered and focused that has a
 * registered tooltip, so a control with no help can neither mask another's nor wait to be noticed
 * once it gains some.
 */
export class HelpTracker {
  private hovered: string | null = null;
  private focused: string | null = null;
  private pinned: string | null = null;
  private dismissed: string | null = null;
  private readonly registered = new Map<string, number>();
  private readonly listeners = new Set<Listener>();

  current(): string | null {
    const shown = [this.pinned, this.hovered, this.focused].find((key) => key !== null && this.registered.has(key)) ?? null;
    return shown !== null && shown === this.dismissed ? null : shown;
  }

  /** Records that a tooltip with content exists for the key; the returned function removes it. */
  register(key: string): () => void {
    this.update(() => {
      this.registered.set(key, (this.registered.get(key) ?? 0) + 1);
    });
    return () => {
      this.update(() => {
        const remaining = (this.registered.get(key) ?? 0) - 1;
        if (remaining > 0) {
          this.registered.set(key, remaining);
          return;
        }
        this.registered.delete(key);
        if (this.pinned === key) this.pinned = null;
      });
    };
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

  /** Pins help for an explicit request; a key with no registered tooltip has nothing to pin and returns false. */
  pin(controlId: string): boolean {
    if (!this.registered.has(controlId)) return false;
    this.update(() => {
      this.pinned = controlId;
      this.dismissed = null;
    });
    return true;
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
