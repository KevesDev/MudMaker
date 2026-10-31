/** See home/homeTestSupport.tsx for what these tests cannot prove. */
import { describe, expect, it, vi } from "vitest";
import themeDefaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { APPEARANCE, SPLASH } from "../home/homeLayout";
import { SCOPE_IDS, ThemeManager } from "../theme";
import { createUiRuntime, loadShippedRegistry } from "../ui";
import { SHELL_ROUTER_OWNER, registerShellRouter } from "./ShellRouter";
import type { Destination } from "./destinations";
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
  return { runtime, theme, navigator, stop, dispatch };
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
  const scopes = [["splash", "home"], ["create", "editor"], ["play", "client"], ["host", "host"]] as const;

  it.each(scopes)("changes only %s's %s scope and stays silent", async (destination, activeScope) => {
    const { dispatch, theme, navigator } = setup();
    const target = otherPreset(theme);
    expect(theme.selectPreset("client", target.id).ok).toBe(true);
    const before = Object.fromEntries(SCOPE_IDS.map((scope) => [scope, theme.getSnapshot(scope).themeId]));
    const next = theme.listPresets().find((preset) => preset.id !== before[activeScope]);
    if (!next) throw new Error("Two presets are required.");
    expect(await navigator.request(destination, new AbortController().signal)).toEqual({ ok: true });
    expect(await dispatch(APPEARANCE, next.id)).toMatchObject({ status: "success", message: "" });
    expect(Object.fromEntries(SCOPE_IDS.map((scope) => [scope, theme.getSnapshot(scope).themeId]))).toEqual({ ...before, [activeScope]: next.id });
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

  it.each(scopes)("preserves every scope when %s's %s preset is rejected", async (destination, activeScope) => {
    const { dispatch, theme, navigator } = setup();
    const target = otherPreset(theme);
    const before = SCOPE_IDS.map((scope) => theme.getSnapshot(scope));
    const select = vi.spyOn(theme, "selectPreset").mockReturnValue({ ok: false, errors: [{ code: "out-of-range", token: "color.text.primary", message: "Refused for the test." }] });
    expect(await navigator.request(destination as Destination, new AbortController().signal)).toEqual({ ok: true });
    expect(await dispatch(APPEARANCE, target.id)).toMatchObject({ status: "recoverable-error", code: "appearance-not-applied" });
    expect(select).toHaveBeenCalledExactlyOnceWith(activeScope, target.id);
    expect(SCOPE_IDS.map((scope) => theme.getSnapshot(scope))).toEqual(before);
  });
});
