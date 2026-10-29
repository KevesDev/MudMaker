import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTOSAVE, CLIENT_SETTINGS, EDITOR, GO_SETTINGS, HOME, NAME, ORPHAN, SAVE, createTestUi, deferred, type TestUi } from "../testSupport";
import type { ActionOutcome, ActionRequest, HandlerRequest } from "./ActionBus";
import { UI_LIMITS } from "./config";
import { ActionBus } from "./ActionBus";
import { UiContractError } from "./types";

const FAILURES = ["validation-error", "denied", "unavailable", "recoverable-error"] as const;

describe("ActionBus dispatch", () => {
  it("shows pending until the handler confirms, then the exact outcome it returned", async () => {
    const ui = createTestUi();
    const gate = deferred<ActionOutcome>();
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", () => gate.promise);

    const running = ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    expect(ui.runtime.bus.getRuntime(SAVE).state).toBe("pending");

    gate.resolve({ status: "success", message: "Project saved" });
    const result = await running;
    expect(result).toEqual({ actionId: "ui.test.save", status: "success", message: "Project saved" });
    expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({ state: "success", message: "Project saved" });
  });

  it.each(FAILURES)("maps a %s outcome to the same control state with its code and text", async (status) => {
    const ui = createTestUi();
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", () => Promise.resolve({ status, code: "E-1", message: "Words for the user" }));
    await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({ state: status, code: "E-1", message: "Words for the user" });
  });

  it("answers an action with no registered owner as unavailable and names the action", async () => {
    const ui = createTestUi();
    const result = await ui.runtime.bus.dispatch({ actionId: "ui.test.orphan", controlId: ORPHAN });
    expect(result).toMatchObject({ actionId: "ui.test.orphan", status: "unavailable", code: "no-action-owner" });
    expect(ui.runtime.bus.getRuntime(ORPHAN).state).toBe("unavailable");
    expect(ui.diagnostics).toEqual([expect.objectContaining({ code: "no-action-owner", actionId: "ui.test.orphan" })]);
  });

  it("answers an action missing from the table as unavailable without touching any control", async () => {
    const ui = createTestUi();
    const result = await ui.runtime.bus.dispatch({ actionId: "ui.test.ghost", controlId: null });
    expect(result).toMatchObject({ actionId: "ui.test.ghost", status: "unavailable", code: "action-unknown" });
  });

  it("runs the handler once when the action is activated again while pending", async () => {
    const ui = createTestUi();
    const gate = deferred<ActionOutcome>();
    const handler = vi.fn(() => gate.promise);
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", handler);

    const first = ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    const second = await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    expect(second).toMatchObject({ status: "ignored", code: "already-running" });
    expect(ui.runtime.announcer.getLast()?.text).toBe("Save Project is already running.");

    gate.resolve({ status: "success" });
    await first;
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("allows a new run after the previous one finished", async () => {
    const ui = createTestUi();
    const handler = vi.fn(() => Promise.resolve<ActionOutcome>({ status: "success" }));
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", handler);
    await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("turns a throwing handler into a recoverable error and records the cause privately", async () => {
    const ui = createTestUi();
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", () => Promise.reject(new Error("disk full at C:\\secret")));
    const result = await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    expect(result).toMatchObject({ status: "recoverable-error", code: "handler-failed" });
    expect(ui.runtime.bus.getRuntime(SAVE).message).toBe("Save Project did not finish. Please try again.");
    expect(ui.diagnostics[0]?.message).toContain("disk full");
    expect(ui.runtime.bus.getRuntime(SAVE).message).not.toContain("disk full");
  });

  it("rejects a handler result that is not a recognised outcome", async () => {
    const ui = createTestUi();
    const bad = (() => Promise.resolve({ status: "saved" })) as unknown as (request: ActionRequest) => Promise<ActionOutcome>;
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", bad);
    const result = await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    expect(result).toMatchObject({ status: "recoverable-error", code: "handler-invalid-outcome" });
    expect(ui.runtime.bus.getRuntime(SAVE).state).toBe("recoverable-error");
  });

  it("passes the typed value to the handler", async () => {
    const ui = createTestUi();
    const handler = vi.fn((_request: ActionRequest) => Promise.resolve<ActionOutcome>({ status: "success" }));
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.autosave", handler);
    await ui.runtime.bus.dispatch({ actionId: "ui.test.autosave", controlId: AUTOSAVE, value: true });
    expect(handler.mock.calls[0]?.[0]).toEqual({ actionId: "ui.test.autosave", controlId: AUTOSAVE, value: true, signal: expect.any(AbortSignal) });
  });

  it("does not run the handler for a disabled control and explains why", async () => {
    const ui = createTestUi();
    const handler = vi.fn(() => Promise.resolve<ActionOutcome>({ status: "success" }));
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", handler);
    ui.runtime.bus.setDisabled(SAVE, "Open a project first.");
    const result = await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    expect(result).toMatchObject({ status: "ignored", code: "control-disabled" });
    expect(handler).not.toHaveBeenCalled();
    expect(ui.runtime.announcer.getLast()?.text).toBe("Save Project is not available. Open a project first.");
    expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({ state: "disabled", reason: "Open a project first." });
  });

  it("blocks a shortcut dispatch only when every control for the action is disabled", async () => {
    const ui = createTestUi();
    const handler = vi.fn(() => Promise.resolve<ActionOutcome>({ status: "success" }));
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", handler);
    ui.runtime.bus.setDisabled(SAVE, "Open a project first.");
    expect(await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: null })).toMatchObject({ status: "ignored" });
    ui.runtime.bus.reset(SAVE);
    expect(await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: null })).toMatchObject({ status: "success" });
  });

  it("keeps a control disabled when it was disabled while its action was running", async () => {
    const ui = createTestUi();
    const gate = deferred<ActionOutcome>();
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", () => gate.promise);
    const running = ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    ui.runtime.bus.setDisabled(SAVE, "Permission was withdrawn.");
    gate.resolve({ status: "success" });
    await running;
    expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({ state: "disabled", reason: "Permission was withdrawn." });
  });

  it("refuses to disable a control without a reason", () => {
    const ui = createTestUi();
    expect(() => ui.runtime.bus.setDisabled(SAVE, "  ")).toThrowError(expect.objectContaining({ code: "disabled-reason-missing" }));
  });
});

describe("ActionBus handler registration", () => {
  it("accepts only the owner named in the action table, once per action", () => {
    const ui = createTestUi();
    const handler = () => Promise.resolve<ActionOutcome>({ status: "success" });
    const codeOf = (attempt: () => void): string => {
      try {
        attempt();
      } catch (failure) {
        if (failure instanceof UiContractError) return failure.code;
      }
      return "none";
    };
    expect(codeOf(() => ui.runtime.bus.registerHandler(HOME, "ui.test.save", handler))).toBe("action-wrong-owner");
    expect(codeOf(() => ui.runtime.bus.registerHandler(EDITOR, "ui.test.ghost", handler))).toBe("action-unknown");
    const release = ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", handler);
    expect(codeOf(() => ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", handler))).toBe("action-owner-duplicate");
    release();
    expect(codeOf(() => ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", handler))).toBe("none");
  });

  it("marks every control that shows the action as pending together", async () => {
    const ui = createTestUi();
    const gate = deferred<ActionOutcome>();
    ui.runtime.bus.registerHandler("WorkspaceNavigator", "ui.nav.settings", () => gate.promise);
    const running = ui.runtime.bus.dispatch({ actionId: "ui.nav.settings", controlId: GO_SETTINGS });
    expect(ui.runtime.bus.getRuntime(GO_SETTINGS).state).toBe("pending");
    expect(ui.runtime.bus.getRuntime(CLIENT_SETTINGS).state).toBe("pending");
    expect(ui.runtime.bus.getRuntime(NAME).state).toBe("ready");
    gate.resolve({ status: "success" });
    await running;
    expect(ui.runtime.bus.getRuntime(CLIENT_SETTINGS).state).toBe("success");
  });
});

describe("diagnostics correlation", () => {
  const correlation = { worldId: "world-7", sessionId: "session-3", requestId: "request-91" } as const;

  it("echoes the owner's identifiers in every diagnostic the request produces", async () => {
    const ui = createTestUi();
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", () => Promise.reject(new Error("disk full")));
    await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE, correlation });
    await ui.runtime.bus.dispatch({ actionId: "ui.test.orphan", controlId: ORPHAN, correlation: { requestId: "request-92" } });
    await ui.runtime.bus.dispatch({ actionId: "ui.test.ghost", controlId: null });
    expect(ui.diagnostics.map((d) => [d.code, d.correlation])).toEqual([
      ["handler-failed", correlation],
      ["no-action-owner", { requestId: "request-92" }],
      ["action-unknown", {}],
    ]);
  });

  it("gives the handler the same identifiers it was dispatched with", async () => {
    const ui = createTestUi();
    const handler = vi.fn((_request: ActionRequest) => Promise.resolve<ActionOutcome>({ status: "success" }));
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", handler);
    await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE, correlation });
    expect(handler.mock.calls[0]?.[0].correlation).toEqual(correlation);
  });
});

describe("a handler that stalls", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function stall(ui: TestUi, limit: number): Promise<{ outcome: ReturnType<typeof deferred<ActionOutcome>>; handler: ReturnType<typeof vi.fn> }> {
    const outcome = deferred<ActionOutcome>();
    const handler = vi.fn((_request: HandlerRequest) => outcome.promise);
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", handler);
    const running = ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE, correlation: { requestId: "r-1" } });
    await vi.advanceTimersByTimeAsync(limit - 1);
    expect(ui.runtime.bus.getRuntime(SAVE).state).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(await running).toMatchObject({ status: "recoverable-error", code: "handler-timeout" });
    return { outcome, handler };
  }

  it("moves the control to a recoverable error after the configured wait, with a diagnostic and an abort signal", async () => {
    vi.useFakeTimers();
    const limit = 500;
    const ui = createTestUi({ maxPendingMs: limit });
    const { handler } = await stall(ui, limit);
    expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({
      state: "recoverable-error",
      code: "handler-timeout",
      message: "Save Project is taking longer than expected.",
    });
    expect(ui.diagnostics).toEqual([expect.objectContaining({ code: "handler-timeout", actionId: "ui.test.save", correlation: { requestId: "r-1" } })]);
    expect(ui.runtime.announcer.getLast()?.text).toBe("Save Project is taking longer than expected.");
    expect((handler.mock.calls[0]?.[0] as HandlerRequest).signal.aborted).toBe(true);
  });

  it("never runs a retry beside the handler that may still be running", async () => {
    vi.useFakeTimers();
    const ui = createTestUi({ maxPendingMs: 100 });
    const { handler } = await stall(ui, 100);
    const retry = await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    expect(retry).toMatchObject({ status: "ignored", code: "already-running" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("replaces the stall with the real answer when it arrives late, and allows a new run afterwards", async () => {
    vi.useFakeTimers();
    const ui = createTestUi({ maxPendingMs: 100 });
    const { outcome, handler } = await stall(ui, 100);
    outcome.resolve({ status: "success", message: "Project saved" });
    await vi.advanceTimersByTimeAsync(0);
    expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({ state: "success", message: "Project saved" });
    expect(ui.diagnostics.map((d) => d.code)).toEqual(["handler-timeout", "handler-settled-late"]);
    handler.mockResolvedValueOnce({ status: "success" });
    expect(await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE })).toMatchObject({ status: "success" });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("shows a late failure as a recoverable error and unblocks the action", async () => {
    vi.useFakeTimers();
    const ui = createTestUi({ maxPendingMs: 100 });
    const { outcome } = await stall(ui, 100);
    outcome.reject(new Error("aborted by the owner"));
    await vi.advanceTimersByTimeAsync(0);
    expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({ state: "recoverable-error", code: "handler-failed" });
    expect(ui.diagnostics.map((d) => d.code)).toEqual(["handler-timeout", "handler-failed", "handler-settled-late"]);
    expect(ui.runtime.bus.admits({ actionId: "ui.test.save", controlId: SAVE })).toBe(true);
  });

  it("leaves a control that was disabled during the stall disabled when the late answer arrives", async () => {
    vi.useFakeTimers();
    const ui = createTestUi({ maxPendingMs: 100 });
    const { outcome } = await stall(ui, 100);
    ui.runtime.bus.setDisabled(SAVE, "Permission was withdrawn.");
    outcome.resolve({ status: "success" });
    await vi.advanceTimersByTimeAsync(0);
    expect(ui.runtime.bus.getRuntime(SAVE)).toMatchObject({ state: "disabled", reason: "Permission was withdrawn." });
  });

  it("does not time out a handler that answers in time, and leaves no timer behind", async () => {
    vi.useFakeTimers();
    const ui = createTestUi({ maxPendingMs: 200 });
    ui.runtime.bus.registerHandler(EDITOR, "ui.test.save", () => Promise.resolve<ActionOutcome>({ status: "success" }));
    await ui.runtime.bus.dispatch({ actionId: "ui.test.save", controlId: SAVE });
    expect(vi.getTimerCount()).toBe(0);
    expect(ui.diagnostics).toEqual([]);
  });

  it("applies the shared limit unless one is given, and refuses a limit that is not positive", () => {
    expect(UI_LIMITS.maxPendingMs).toBeGreaterThan(0);
    const ui = createTestUi();
    const make = (maxPendingMs: number): ActionBus => new ActionBus(ui.runtime.registry, ui.runtime.announcer, () => undefined, { maxPendingMs });
    expect(() => make(0)).toThrowError(expect.objectContaining({ code: "max-pending-invalid" }));
    expect(() => make(Number.NaN)).toThrowError(expect.objectContaining({ code: "max-pending-invalid" }));
    expect(make(1)).toBeInstanceOf(ActionBus);
  });
});
