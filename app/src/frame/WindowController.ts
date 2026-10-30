import type { Correlation, UiDiagnostic } from "../ui";
import { frameCopy } from "./frameCopy";
import type { WindowShell } from "./windowShell";

export type WindowMode = "restored" | "maximized";

interface WindowControllerOptions {
  readonly shell: WindowShell;
  /** Receives the records for window failures that no control shows. */
  readonly report: (record: UiDiagnostic) => void;
  /** Read at each failure, so records carry the launch id once the shell has given it. */
  readonly correlation: () => Correlation;
}

type Listener = () => void;

/**
 * The one owner of what the interface knows about its window. The mode is always read back from the
 * window, never assumed from the command that was sent, so a window that is snapped or refuses a
 * command still shows the truth.
 */
export class WindowController {
  /** The window opens restored; the first read after someone watches replaces this with the real mode. */
  private mode: WindowMode = "restored";
  private readonly listeners = new Set<Listener>();
  private registration: Promise<(() => void) | null> | null = null;
  /** The read that is asking the window now, and the one read that will follow it for every change that arrives meanwhile. */
  private current: Promise<WindowMode | null> | null = null;
  private trailing: Promise<WindowMode | null> | null = null;
  /** What the last failed read reported, so a failure that repeats is logged once. */
  private lastFailure: string | null = null;

  constructor(private readonly options: WindowControllerOptions) {}

  /** Watches the window only while something is listening. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (this.registration === null) this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  };

  getSnapshot = (): WindowMode => this.mode;

  minimize(): Promise<void> {
    return this.options.shell.minimize();
  }

  /** Asks the window to switch and answers with the mode it reported afterwards, or null when that read failed. */
  async toggleMaximize(): Promise<WindowMode | null> {
    await this.options.shell.toggleMaximize();
    return this.refresh();
  }

  /**
   * Reads the mode from the window and answers with what was read, or null when the read failed. Only one
   * read asks the window at a time; changes that arrive meanwhile share a single read that starts after it,
   * so a burst of resize events costs two reads and the last change is never missed.
   */
  refresh(): Promise<WindowMode | null> {
    if (this.current === null) return this.read();
    this.trailing ??= this.current.then(() => {
      this.trailing = null;
      return this.read();
    });
    return this.trailing;
  }

  private read(): Promise<WindowMode | null> {
    const finished = this.readOnce().finally(() => {
      if (this.current === finished) this.current = null;
    });
    this.current = finished;
    return finished;
  }

  private async readOnce(): Promise<WindowMode | null> {
    try {
      const mode: WindowMode = (await this.options.shell.isMaximized()) ? "maximized" : "restored";
      this.lastFailure = null;
      this.set(mode);
      return mode;
    } catch (failure) {
      this.fail("window-state-unreadable", frameCopy.stateUnreadable, failure);
      return null;
    }
  }

  private start(): void {
    this.registration = this.options.shell
      .onStateChange(() => void this.refresh())
      .catch((failure: unknown) => {
        this.fail("window-watch-failed", frameCopy.changesUnwatched, failure);
        return null;
      });
    void this.refresh();
  }

  private stop(): void {
    const registration = this.registration;
    this.registration = null;
    void registration?.then((stopListening) => stopListening?.());
  }

  private set(mode: WindowMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    for (const listener of [...this.listeners]) listener();
  }

  private fail(code: string, message: string, failure: unknown): void {
    const detail = failure instanceof Error ? failure.message : String(failure);
    const signature = `${code}:${detail}`;
    if (signature === this.lastFailure) return;
    this.lastFailure = signature;
    this.options.report({ severity: "error", code, actionId: null, controlId: null, message, detail, correlation: this.options.correlation() });
  }
}
