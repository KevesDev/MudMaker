/** See homeTestSupport.tsx for what these tests cannot prove. */
import { describe, expect, it, vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { SCOPE_IDS, ThemeManager } from "../theme";
import { createUiRuntime, loadShippedRegistry, type UiDiagnostic } from "../ui";
import { HOME_ROUTER, registerHomeRouter } from "./HomeRouter";
import { APPEARANCE, SPLASH } from "./homeLayout";

const registry = loadShippedRegistry();

function actionOf(controlId: string): string {
  const actionId = registry.requireControl(controlId).actionId;
  if (actionId === null) throw new Error(`${controlId} has no action`);
  return actionId;
}

function setup(options: { readonly quit?: () => Promise<void>; readonly maxPendingMs?: number; readonly theme?: ThemeManager } = {}) {
  const diagnostics: UiDiagnostic[] = [];
  const runtime = createUiRuntime({
    registry,
    document,
    diagnostics: (record) => diagnostics.push(record),
    ...(options.maxPendingMs === undefined ? {} : { maxPendingMs: options.maxPendingMs }),
  });
  const theme = options.theme ?? new ThemeManager(themeDefaults);
  const quit = vi.fn(options.quit ?? (() => Promise.resolve()));
  const retry = vi.fn();
  const stop = registerHomeRouter(runtime.bus, registry, { quit, theme, retryStartup: retry });
  const dispatch = (controlId: string, value?: string | number | boolean) =>
    runtime.bus.dispatch({ actionId: actionOf(controlId), controlId, ...(value === undefined ? {} : { value }) });
  return { runtime, theme, quit, retry, stop, dispatch, diagnostics };
}

function otherPreset(theme: ThemeManager): { id: string; label: string } {
  const current = theme.getSnapshot("home").themeId;
  const other = theme.listPresets().find((preset) => preset.id !== current);
  if (!other) throw new Error("The defaults must ship at least two presets.");
  return other;
}

describe("the home router", () => {
  it("is the owner the action table names for the actions it handles", () => {
    for (const controlId of [SPLASH.quit, APPEARANCE, SPLASH.retry]) {
      expect(registry.action(actionOf(controlId))?.owner).toBe(HOME_ROUTER);
    }
  });

  it("leaves the workspace entries without a handler so the bus answers that they are unavailable", async () => {
    const { dispatch } = setup();
    for (const controlId of [SPLASH.create, SPLASH.play, SPLASH.host]) {
      expect(await dispatch(controlId)).toMatchObject({ status: "unavailable", code: "no-action-owner" });
    }
  });

  it("stops handling its actions when it is torn down", async () => {
    const { dispatch, stop, quit } = setup();
    stop();
    expect(await dispatch(SPLASH.quit)).toMatchObject({ status: "unavailable", code: "no-action-owner" });
    expect(quit).not.toHaveBeenCalled();
  });
});

describe("quit", () => {
  it("asks the shell to exit once and reports success", async () => {
    const { dispatch, quit } = setup();
    expect(await dispatch(SPLASH.quit)).toMatchObject({ status: "success" });
    expect(quit).toHaveBeenCalledTimes(1);
  });

  it("reports a recoverable error and logs it when the shell refuses", async () => {
    const { dispatch, diagnostics } = setup({ quit: () => Promise.reject(new Error("refused")) });
    expect(await dispatch(SPLASH.quit)).toMatchObject({ status: "recoverable-error", code: "handler-failed" });
    expect(diagnostics.map((record) => [record.code, record.severity])).toEqual([["handler-failed", "error"]]);
  });

  it("settles once the bus stops waiting, so a stalled exit can be tried again", async () => {
    const { dispatch, quit } = setup({ quit: () => new Promise<void>(() => undefined), maxPendingMs: 20 });
    expect(await dispatch(SPLASH.quit)).toMatchObject({ code: "handler-timeout" });
    await new Promise((resolve) => setTimeout(resolve));
    expect(await dispatch(SPLASH.quit)).toMatchObject({ code: "handler-timeout" });
    expect(quit).toHaveBeenCalledTimes(2);
  });
});

describe("opening the Settings menu", () => {
  it("is owned by the home router and answers success without a message, so nothing is announced", async () => {
    expect(registry.action(actionOf(SPLASH.settings))?.owner).toBe(HOME_ROUTER);
    const { dispatch, runtime } = setup();
    const before = runtime.announcer.getLast();
    expect(await dispatch(SPLASH.settings)).toMatchObject({ status: "success", message: "" });
    expect(runtime.announcer.getLast()?.text).toBe("");
    expect(runtime.announcer.getLast()).not.toBe(before);
  });

  it("is unavailable once the router stops handling it", async () => {
    const { dispatch, stop } = setup();
    stop();
    expect(await dispatch(SPLASH.settings)).toMatchObject({ status: "unavailable", code: "no-action-owner" });
  });
});

describe("retry", () => {
  it("starts the startup checks again once", async () => {
    const { dispatch, retry } = setup();
    expect(await dispatch(SPLASH.retry)).toMatchObject({ status: "success" });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("appearance", () => {
  it("applies the chosen preset to every theme scope and says which one", async () => {
    const { dispatch, theme } = setup();
    const target = otherPreset(theme);
    const result = await dispatch(APPEARANCE, target.id);
    expect(result).toMatchObject({ status: "success" });
    expect(result.status === "success" ? result.message : "").toContain(target.label);
    expect(SCOPE_IDS.map((scope) => theme.getSnapshot(scope).themeId)).toEqual(SCOPE_IDS.map(() => target.id));
  });

  it.each([
    ["an unknown preset", "no-such-preset"],
    ["no value", undefined],
    ["a value that is not text", true],
  ])("refuses %s without changing any scope", async (_name, value) => {
    const { dispatch, theme } = setup();
    const before = SCOPE_IDS.map((scope) => theme.getSnapshot(scope));
    expect(await dispatch(APPEARANCE, value)).toMatchObject({ status: "validation-error" });
    expect(SCOPE_IDS.map((scope) => theme.getSnapshot(scope))).toEqual(before);
  });

  it("puts back the scopes it already changed when a later scope refuses, and reports a recoverable error", async () => {
    const theme = new ThemeManager(themeDefaults);
    const target = otherPreset(theme);
    const before = SCOPE_IDS.map((scope) => theme.getSnapshot(scope).themeId);
    const select = theme.selectPreset.bind(theme);
    const failing = SCOPE_IDS[2];
    vi.spyOn(theme, "selectPreset").mockImplementation((scope, presetId) =>
      scope === failing && presetId === target.id
        ? { ok: false, errors: [{ code: "out-of-range", token: "color.text.primary", message: "Refused for the test." }] }
        : select(scope, presetId),
    );
    const { dispatch } = setup({ theme });
    expect(await dispatch(APPEARANCE, target.id)).toMatchObject({ status: "recoverable-error", code: "appearance-not-applied" });
    expect(SCOPE_IDS.map((scope) => theme.getSnapshot(scope).themeId)).toEqual(before);
  });

  it("says so when a scope refuses and a scope it already changed cannot be put back", async () => {
    const theme = new ThemeManager(themeDefaults);
    const target = otherPreset(theme);
    const first = SCOPE_IDS[0];
    const refused = SCOPE_IDS[2];
    const select = theme.selectPreset.bind(theme);
    const refusal = { ok: false, errors: [{ code: "out-of-range", token: "color.text.primary", message: "Refused for the test." }] } as const;
    vi.spyOn(theme, "selectPreset").mockImplementation((scope, presetId) =>
      (scope === refused && presetId === target.id) || (scope === first && presetId !== target.id) ? refusal : select(scope, presetId),
    );
    const { dispatch } = setup({ theme });
    expect(await dispatch(APPEARANCE, target.id)).toMatchObject({ status: "recoverable-error", code: "appearance-partly-applied" });
  });
});
