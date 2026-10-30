/** The window is a fake: these tests show which handler each action reaches and how failures are answered, not what Windows does. */
import { describe, expect, it, vi } from "vitest";
import actionsJson from "../../../contracts/ui/v1/actions.v1.json";
import { createUiRuntime, loadShippedRegistry, type ActionRegistry, type UiDiagnostic } from "../ui";
import { HOME_ROUTER } from "../home/HomeRouter";
import { FRAME_ACTION_OWNER, actionIdOf, registerFrameActions } from "./frameActions";
import { fakeWindowShell } from "./frameTestSupport";
import { FRAME } from "./frameLayout";
import { loadFrameRegistry } from "./frameRegistry";
import { WindowController } from "./WindowController";

const QUIT_CONTROL = "home.splash.11";

function setup(registry: ActionRegistry, options: { readonly quit?: () => Promise<void>; readonly maxPendingMs?: number } = {}) {
  const diagnostics: UiDiagnostic[] = [];
  const runtime = createUiRuntime({
    registry,
    document,
    diagnostics: (record) => diagnostics.push(record),
    ...(options.maxPendingMs === undefined ? {} : { maxPendingMs: options.maxPendingMs }),
  });
  const shell = fakeWindowShell();
  const quit = vi.fn(options.quit ?? (() => Promise.resolve()));
  const window = new WindowController({ shell, report: (record) => diagnostics.push(record), correlation: () => ({}) });
  const stop = registerFrameActions(runtime.bus, registry, { quit, window });
  const dispatch = (controlId: string) => runtime.bus.dispatch({ actionId: actionIdOf(registry, controlId), controlId });
  return { runtime, shell, quit, stop, dispatch, diagnostics };
}

describe.each([
  ["the frame's own registry", loadFrameRegistry()],
  ["the full catalogs", loadShippedRegistry()],
])("the frame actions on %s", (_name, registry) => {
  it("belong to the owner the action table names, which is the one that owns Quit", () => {
    for (const id of [FRAME.minimize, FRAME.maximize, FRAME.restore, FRAME.close]) {
      expect(registry.action(actionIdOf(registry, id))?.owner, id).toBe(FRAME_ACTION_OWNER);
    }
  });

  it("minimizes through the shell once and answers without words, so nothing is announced twice", async () => {
    const { dispatch, shell } = setup(registry);
    expect(await dispatch(FRAME.minimize)).toEqual({ actionId: actionIdOf(registry, FRAME.minimize), status: "success", message: "" });
    expect(shell.minimize).toHaveBeenCalledTimes(1);
  });

  it("answers a toggle with the mode the window reports, from either catalog entry of the toggle", async () => {
    const { dispatch, shell } = setup(registry);
    expect(actionIdOf(registry, FRAME.maximize)).toBe(actionIdOf(registry, FRAME.restore));
    expect(await dispatch(FRAME.maximize)).toMatchObject({ status: "success", message: "The window now fills the screen." });
    expect(await dispatch(FRAME.restore)).toMatchObject({ status: "success", message: "The window is back to its earlier size." });
    expect(shell.toggleMaximize).toHaveBeenCalledTimes(2);
  });

  it("announces no mode when the window could not be read after the change", async () => {
    const { dispatch, shell } = setup(registry);
    shell.isMaximized.mockRejectedValueOnce(new Error("no window"));
    expect(await dispatch(FRAME.maximize)).toMatchObject({ status: "success", message: "" });
  });

  it("shows a window that refuses as a recoverable error and logs the refusal with the action and control", async () => {
    const { dispatch, shell, diagnostics, runtime } = setup(registry);
    shell.minimize.mockRejectedValueOnce(new Error("minimize denied by the shell"));
    expect(await dispatch(FRAME.minimize)).toMatchObject({ status: "recoverable-error", code: "handler-failed" });
    expect(runtime.bus.getRuntime(FRAME.minimize)).toMatchObject({ state: "recoverable-error", code: "handler-failed" });
    expect(diagnostics).toEqual([
      expect.objectContaining({ severity: "error", code: "handler-failed", actionId: actionIdOf(registry, FRAME.minimize), controlId: FRAME.minimize, detail: "minimize denied by the shell" }),
    ]);
  });

  it("stops waiting for a window that never answers, aborts the wait and shows a recoverable error", async () => {
    const { dispatch, shell, runtime } = setup(registry, { maxPendingMs: 20 });
    shell.toggleMaximize.mockImplementationOnce(() => new Promise<void>(() => undefined));
    expect(await dispatch(FRAME.maximize)).toMatchObject({ status: "recoverable-error", code: "handler-timeout" });
    expect(runtime.bus.getRuntime(FRAME.maximize).state).toBe("recoverable-error");
  });

  it("asks the shell to exit once and reports success", async () => {
    const { dispatch, quit } = setup(registry);
    expect(await dispatch(FRAME.close)).toMatchObject({ status: "success", message: "Closing MudMaker." });
    expect(quit).toHaveBeenCalledTimes(1);
  });

  it("reports a recoverable error and logs it when the shell refuses to exit, and never reports closing", async () => {
    const { dispatch, diagnostics } = setup(registry, { quit: () => Promise.reject(new Error("the shell would not exit")) });
    expect(await dispatch(FRAME.close)).toMatchObject({ status: "recoverable-error", code: "handler-failed" });
    expect(diagnostics.map((record) => [record.code, record.severity])).toEqual([["handler-failed", "error"]]);
  });

  it("settles once the bus stops waiting, so a stalled exit can be tried again", async () => {
    const { dispatch, quit } = setup(registry, { quit: () => new Promise<void>(() => undefined), maxPendingMs: 20 });
    expect(await dispatch(FRAME.close)).toMatchObject({ code: "handler-timeout" });
    await new Promise((resolve) => setTimeout(resolve));
    expect(await dispatch(FRAME.close)).toMatchObject({ code: "handler-timeout" });
    expect(quit).toHaveBeenCalledTimes(2);
  });

  it("stop handling when torn down", async () => {
    const { dispatch, stop, quit } = setup(registry);
    stop();
    expect(await dispatch(FRAME.close)).toMatchObject({ status: "unavailable", code: "no-action-owner" });
    expect(quit).not.toHaveBeenCalled();
  });
});

describe("the owner of the frame actions", () => {
  it("is the owner the action table file names for each of them, and the one name every router of the home screen uses", () => {
    const owners = ["ui.app.quit", "ui.window.minimize", "ui.window.toggleMaximize"].map((id) => actionsJson.actions.find((action) => action.id === id)?.owner);
    expect(owners).toEqual([FRAME_ACTION_OWNER, FRAME_ACTION_OWNER, FRAME_ACTION_OWNER]);
    expect(HOME_ROUTER).toBe(FRAME_ACTION_OWNER);
    expect(actionsJson.actions.filter((action) => action.owner === HOME_ROUTER).length).toBeGreaterThan(owners.length);
  });
});

describe("Close and Quit", () => {
  it("are one action with one handler: on the full catalogs Quit runs the same quit as Close", async () => {
    const registry = loadShippedRegistry();
    expect(actionIdOf(registry, FRAME.close)).toBe(actionIdOf(registry, QUIT_CONTROL));
    const { dispatch, quit } = setup(registry);
    expect(await dispatch(QUIT_CONTROL)).toMatchObject({ status: "success", message: "Closing MudMaker." });
    expect(quit).toHaveBeenCalledTimes(1);
  });
});
