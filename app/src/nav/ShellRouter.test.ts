/** See home/homeTestSupport.tsx for what these tests cannot prove. */
import { describe, expect, it, vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { APPEARANCE, SPLASH } from "../home/homeLayout";
import { SCOPE_IDS, ThemeManager } from "../theme";
import { createUiRuntime, loadShippedRegistry } from "../ui";
import { SHELL_ROUTER_OWNER, registerShellRouter } from "./ShellRouter";
import { WorkspaceNavigator } from "./WorkspaceNavigator";

const registry = loadShippedRegistry();

function actionOf(controlId: string): string {
  const actionId = registry.requireControl(controlId).actionId;
  if (actionId === null) throw new Error(`${controlId} has no action`);
  return actionId;
}

function setup(theme: ThemeManager = new ThemeManager(themeDefaults)) {
  const runtime = createUiRuntime({ registry, document, diagnostics: () => undefined });
  const navigator = new WorkspaceNavigator({}, () => undefined, () => ({}));
  const stop = registerShellRouter(runtime.bus, registry, { theme, navigator });
  const dispatch = (controlId: string, value?: string | number | boolean) =>
    runtime.bus.dispatch({ actionId: actionOf(controlId), controlId, ...(value === undefined ? {} : { value }) });
  return { runtime, theme, stop, dispatch };
}

function otherPreset(theme: ThemeManager): { id: string; label: string } {
  const current = theme.getSnapshot("home").themeId;
  const other = theme.listPresets().find((preset) => preset.id !== current);
  if (!other) throw new Error("The defaults must ship at least two presets.");
  return other;
}

describe("opening the Settings menu", () => {
  it("is owned by the shell router and answers success without a message, so nothing is announced", async () => {
    expect(registry.action(actionOf(SPLASH.settings))?.owner).toBe(SHELL_ROUTER_OWNER);
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
    const { dispatch } = setup(theme);
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
    const { dispatch } = setup(theme);
    expect(await dispatch(APPEARANCE, target.id)).toMatchObject({ status: "recoverable-error", code: "appearance-partly-applied" });
  });
});
