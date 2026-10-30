export interface ClientSession {
  readonly id: string;
  readonly worldName: string;
}

export interface ClientSessionsSnapshot {
  readonly sessions: readonly ClientSession[];
  /** Null while there is no session, which is when the World Library shows. */
  readonly activeId: string | null;
}

type Listener = () => void;

/**
 * The open game sessions of this window and which one is showing. Connecting belongs to the connection feature, which
 * opens a session here once a world answers; the Play workspace only shows what is held.
 */
export class ClientSessions {
  private snapshot: ClientSessionsSnapshot = { sessions: [], activeId: null };
  private readonly listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): ClientSessionsSnapshot => this.snapshot;

  open(session: ClientSession): void {
    const others = this.snapshot.sessions.filter((existing) => existing.id !== session.id);
    this.set({ sessions: [...others, session], activeId: session.id });
  }

  select(id: string): void {
    if (this.snapshot.sessions.some((session) => session.id === id)) this.set({ ...this.snapshot, activeId: id });
  }

  /** Closing the showing session shows the one before it, or the library when it was the last. */
  close(id: string): void {
    const index = this.snapshot.sessions.findIndex((session) => session.id === id);
    if (index < 0) return;
    const sessions = this.snapshot.sessions.filter((session) => session.id !== id);
    const activeId = this.snapshot.activeId === id ? (sessions[Math.max(0, index - 1)]?.id ?? null) : this.snapshot.activeId;
    this.set({ sessions, activeId });
  }

  /** Puts the session at this position of the resulting order. */
  move(id: string, toIndex: number): void {
    const from = this.snapshot.sessions.findIndex((session) => session.id === id);
    const moved = this.snapshot.sessions[from];
    if (moved === undefined) return;
    const rest = this.snapshot.sessions.filter((session) => session.id !== id);
    const at = Math.min(Math.max(toIndex, 0), rest.length);
    this.set({ ...this.snapshot, sessions: [...rest.slice(0, at), moved, ...rest.slice(at)] });
  }

  private set(next: ClientSessionsSnapshot): void {
    this.snapshot = next;
    for (const listener of [...this.listeners]) listener();
  }
}

/** The one set of sessions for this window. */
export const clientSessions = new ClientSessions();
