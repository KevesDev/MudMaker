import type { LeaveImpact } from "../nav/leaveImpact";
import { UiContractError } from "../ui";
import { EDITOR_LIMITS } from "./editorConfig";

/** One change to the draft, with the means to take it back. Both halves act on the draft's own owner; the stack never reads the draft. */
export interface DraftCommand {
  readonly label: string;
  do(): void;
  undo(): void;
}

export interface DraftUndoSnapshot {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** True when the draft differs from the point last marked saved. */
  readonly dirty: boolean;
  /** The label of the change Undo would take back, or null. */
  readonly undoLabel: string | null;
  readonly redoLabel: string | null;
  /** Changes on every do, undo, redo and save, so a decision made about older state is recognized as stale. */
  readonly revision: number;
}

/**
 * The one owner of the draft's change history. Commands are applied through it, so what can be undone is exactly
 * what was done. A new command drops everything that could be redone. The history is bounded; when its oldest
 * entry is dropped, a saved point older than the history can never be returned to, so the draft stays unsaved
 * until the next save.
 */
export class DraftUndoStack {
  private done: DraftCommand[] = [];
  private undone: DraftCommand[] = [];
  /** How many commands have been dropped from the front, so positions stay comparable with the saved mark. */
  private dropped = 0;
  private savedAt: number | null = 0;
  private revision = 0;
  private snapshot: DraftUndoSnapshot | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly limit: number = EDITOR_LIMITS.undoDepth) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new UiContractError("undo-limit-invalid", "DraftUndoStack", `The undo depth must be a whole number of at least 1, not ${String(limit)}.`);
    }
  }

  /** Applies the command and records it. A command that throws changes nothing. */
  execute(command: DraftCommand): void {
    command.do();
    if (this.savedAt !== null && this.savedAt > this.position()) this.savedAt = null;
    this.done.push(command);
    this.undone = [];
    if (this.done.length > this.limit) {
      this.done.shift();
      this.dropped += 1;
    }
    this.changed();
  }

  /** Takes back the latest change. Returns false when there is none. A command that throws leaves the history as it was. */
  undo(): boolean {
    const command = this.done[this.done.length - 1];
    if (command === undefined) return false;
    command.undo();
    this.done.pop();
    this.undone.push(command);
    this.changed();
    return true;
  }

  redo(): boolean {
    const command = this.undone[this.undone.length - 1];
    if (command === undefined) return false;
    command.do();
    this.undone.pop();
    this.done.push(command);
    this.changed();
    return true;
  }

  /** Records that the draft as it is now has been saved. */
  markSaved(): void {
    this.savedAt = this.position();
    this.changed();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): DraftUndoSnapshot => {
    this.snapshot ??= Object.freeze({
      canUndo: this.done.length > 0,
      canRedo: this.undone.length > 0,
      dirty: this.savedAt !== this.position(),
      undoLabel: this.done[this.done.length - 1]?.label ?? null,
      redoLabel: this.undone[this.undone.length - 1]?.label ?? null,
      revision: this.revision,
    });
    return this.snapshot;
  };

  private position(): number {
    return this.dropped + this.done.length;
  }

  private changed(): void {
    this.revision += 1;
    this.snapshot = null;
    for (const listener of [...this.listeners]) listener();
  }
}

/**
 * What leaving the editor costs while the draft has unsaved changes, in the form the workspace navigator asks for.
 * Null when nothing would be lost. The names are the draft's own, such as the project name.
 */
export function describeDraftLeaveImpact(stack: DraftUndoStack, resources: readonly string[]): LeaveImpact | null {
  const { dirty, revision } = stack.getSnapshot();
  return dirty ? { revision, resources } : null;
}
