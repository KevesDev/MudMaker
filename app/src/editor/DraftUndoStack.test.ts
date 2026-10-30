import { describe, expect, it, vi } from "vitest";
import { WorkspaceNavigator } from "../nav/WorkspaceNavigator";
import type { EditorSessionController, ServiceOutcome } from "../nav/leaveImpact";
import { DraftUndoStack, describeDraftLeaveImpact, type DraftCommand } from "./DraftUndoStack";
import { EDITOR_LIMITS } from "./editorConfig";

/** A draft that is only a list of numbers, so what the stack did to it can be read back. */
function draft() {
  const items: number[] = [];
  const add = (value: number): DraftCommand => ({
    label: `Add ${value}`,
    do: () => void items.push(value),
    undo: () => void items.pop(),
  });
  return { items, add };
}

describe("do, undo and redo", () => {
  it("applies commands in order, takes them back newest first, and replays them", () => {
    const { items, add } = draft();
    const stack = new DraftUndoStack();
    stack.execute(add(1));
    stack.execute(add(2));
    expect(items).toEqual([1, 2]);
    expect(stack.getSnapshot()).toMatchObject({ canUndo: true, canRedo: false, undoLabel: "Add 2", redoLabel: null });
    expect(stack.undo()).toBe(true);
    expect(items).toEqual([1]);
    expect(stack.getSnapshot()).toMatchObject({ canUndo: true, canRedo: true, undoLabel: "Add 1", redoLabel: "Add 2" });
    expect(stack.redo()).toBe(true);
    expect(items).toEqual([1, 2]);
  });

  it("answers false and changes nothing when there is nothing to undo or redo", () => {
    const stack = new DraftUndoStack();
    const before = stack.getSnapshot();
    expect(stack.undo()).toBe(false);
    expect(stack.redo()).toBe(false);
    expect(stack.getSnapshot()).toBe(before);
  });

  it("drops everything that could be redone when a new command is made", () => {
    const { items, add } = draft();
    const stack = new DraftUndoStack();
    stack.execute(add(1));
    stack.execute(add(2));
    stack.undo();
    stack.execute(add(3));
    expect(stack.getSnapshot().canRedo).toBe(false);
    expect(stack.redo()).toBe(false);
    expect(items).toEqual([1, 3]);
  });

  it("changes nothing when a command fails, and says so to the caller", () => {
    const { items, add } = draft();
    const stack = new DraftUndoStack();
    stack.execute(add(1));
    const before = stack.getSnapshot();
    const failing: DraftCommand = { label: "Break", do: () => { throw new Error("cannot"); }, undo: () => undefined };
    expect(() => stack.execute(failing)).toThrowError("cannot");
    expect(stack.getSnapshot()).toBe(before);
    const stuck: DraftCommand = { label: "Stuck", do: () => undefined, undo: () => { throw new Error("cannot undo"); } };
    stack.execute(stuck);
    const afterStuck = stack.getSnapshot();
    expect(() => stack.undo()).toThrowError("cannot undo");
    expect(stack.getSnapshot()).toBe(afterStuck);
    expect(items).toEqual([1]);
  });
});

describe("the bound", () => {
  it("keeps only the newest commands up to the limit, and the oldest can no longer be undone", () => {
    const { items, add } = draft();
    const stack = new DraftUndoStack(3);
    for (const value of [1, 2, 3, 4, 5]) stack.execute(add(value));
    let undone = 0;
    while (stack.undo()) undone += 1;
    expect(undone).toBe(3);
    expect(items).toEqual([1, 2]);
  });

  it("reads its default from the named configuration and refuses a limit that cannot hold a command", () => {
    const { add } = draft();
    const stack = new DraftUndoStack();
    for (let value = 0; value < EDITOR_LIMITS.undoDepth + 5; value += 1) stack.execute(add(value));
    let undone = 0;
    while (stack.undo()) undone += 1;
    expect(undone).toBe(EDITOR_LIMITS.undoDepth);
    for (const bad of [0, -1, 1.5, Number.NaN]) expect(() => new DraftUndoStack(bad)).toThrowError(expect.objectContaining({ code: "undo-limit-invalid" }));
  });
});

describe("unsaved changes", () => {
  it("is clean at the start, dirty after a change, and clean again at the saved point by undo or by redo", () => {
    const { add } = draft();
    const stack = new DraftUndoStack();
    expect(stack.getSnapshot().dirty).toBe(false);
    stack.execute(add(1));
    expect(stack.getSnapshot().dirty).toBe(true);
    stack.markSaved();
    expect(stack.getSnapshot().dirty).toBe(false);
    stack.execute(add(2));
    expect(stack.getSnapshot().dirty).toBe(true);
    stack.undo();
    expect(stack.getSnapshot().dirty).toBe(false);
    stack.undo();
    expect(stack.getSnapshot().dirty).toBe(true);
    stack.redo();
    expect(stack.getSnapshot().dirty).toBe(false);
  });

  it("stays dirty at the same depth when the saved branch was replaced by a different change", () => {
    const { add } = draft();
    const stack = new DraftUndoStack();
    stack.execute(add(1));
    stack.execute(add(2));
    stack.markSaved();
    stack.undo();
    stack.execute(add(3));
    expect(stack.getSnapshot().dirty).toBe(true);
  });

  it("stays dirty after the saved point has been pushed out of the bounded history, until the next save", () => {
    const { add } = draft();
    const stack = new DraftUndoStack(2);
    stack.execute(add(1));
    stack.markSaved();
    for (const value of [2, 3, 4]) stack.execute(add(value));
    while (stack.undo()) continue;
    expect(stack.getSnapshot().dirty).toBe(true);
    stack.markSaved();
    expect(stack.getSnapshot().dirty).toBe(false);
  });
});

describe("watching the stack", () => {
  it("tells listeners after every change, gives a new snapshot only when something changed, and stops after unsubscribing", () => {
    const { add } = draft();
    const stack = new DraftUndoStack();
    const listener = vi.fn();
    const unsubscribe = stack.subscribe(listener);
    const revisions = [stack.getSnapshot().revision];
    stack.execute(add(1));
    stack.undo();
    stack.redo();
    stack.markSaved();
    expect(listener).toHaveBeenCalledTimes(4);
    revisions.push(stack.getSnapshot().revision);
    expect(stack.getSnapshot()).toBe(stack.getSnapshot());
    expect(revisions[1]).toBeGreaterThan(revisions[0] ?? Number.POSITIVE_INFINITY);
    unsubscribe();
    stack.execute(add(2));
    expect(listener).toHaveBeenCalledTimes(4);
  });
});

describe("what leaving the editor costs", () => {
  it("reports nothing while clean and the named resources with the current revision while dirty, changing with every edit", () => {
    const { add } = draft();
    const stack = new DraftUndoStack();
    expect(describeDraftLeaveImpact(stack, ["Ashenvale"])).toBeNull();
    stack.execute(add(1));
    const first = describeDraftLeaveImpact(stack, ["Ashenvale"]);
    expect(first).toEqual({ revision: stack.getSnapshot().revision, resources: ["Ashenvale"] });
    stack.execute(add(2));
    expect(describeDraftLeaveImpact(stack, ["Ashenvale"])?.revision).not.toBe(first?.revision);
    stack.markSaved();
    expect(describeDraftLeaveImpact(stack, ["Ashenvale"])).toBeNull();
  });

  it("makes the workspace navigator hold a switch from Create while the draft is unsaved, naming the project, and not when it is saved", async () => {
    const { add } = draft();
    const stack = new DraftUndoStack();
    const ok = (): Promise<ServiceOutcome> => Promise.resolve({ ok: true, revision: stack.getSnapshot().revision });
    const editor: EditorSessionController = {
      describeLeaveImpact: (request) => Promise.resolve(request.from === "create" ? describeDraftLeaveImpact(stack, ["Ashenvale"]) : null),
      retainDraft: ok,
      save: ok,
    };
    const navigator = new WorkspaceNavigator({ editor }, () => undefined, () => ({}));
    const signal = new AbortController().signal;
    expect((await navigator.request("create", signal)).ok).toBe(true);
    expect((await navigator.request("play", signal)).ok).toBe(true);
    expect(navigator.getSnapshot().destination).toBe("play");
    await navigator.request("create", signal);
    stack.execute(add(1));
    const held = await navigator.request("play", signal);
    expect(held.ok).toBe(true);
    const transition = navigator.getSnapshot().transition;
    expect(navigator.getSnapshot().destination).toBe("create");
    expect(transition?.impacts).toMatchObject([{ kind: "editor", resources: ["Ashenvale"], revision: stack.getSnapshot().revision }]);
  });
});
