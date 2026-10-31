import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { healthyHome, renderApp } from "../home/homeTestSupport";
import { PreferencesStore } from "../prefs/PreferencesStore";
import { ClientProfileBook } from "../prefs/ClientProfileBook";
import { SAVE_DEBOUNCE_MS } from "../prefs/prefsConfig";
import { ThemeManager, USER_THEME_SCHEMA, SCOPE_IDS, ThemeSchema } from "./index";
import defaults from "../../../contracts/ui/v1/theme-defaults.v1.json";
import { THEME_TOKEN_CONTROLS } from "./themeEditorControls";
import { NAVIGATION, WORKSPACE_SCOPE, type WorkspaceDestination } from "../nav/destinations";
import { loadShippedRegistry, useUi, type UiRuntime } from "../ui";
import { SPLASH } from "../home/homeLayout";

const stops: (() => void)[] = [];
afterEach(() => { cleanup(); for (const stop of stops.splice(0)) stop(); vi.useRealTimers(); document.documentElement.removeAttribute("style"); });
const dialogUi = () => within(document.querySelector<HTMLElement>('[role="dialog"]') as HTMLElement);
function field(name: string): HTMLInputElement | HTMLSelectElement {
  const label = [...document.querySelectorAll<HTMLLabelElement>(".theme-editor-fields label")].find((entry) => entry.textContent === name);
  expect(label, name).toBeDefined();
  const element = document.getElementById(label?.htmlFor ?? "");
  expect(element instanceof HTMLInputElement || element instanceof HTMLSelectElement, name).toBe(true);
  return element as HTMLInputElement | HTMLSelectElement;
}

async function setup(configure?: (manager: ThemeManager) => void, surfaces = {}) {
  const home = healthyHome({ surfaces });
  let saved: unknown = null;
  const write = vi.fn(async (document: unknown) => { saved = document; });
  const store = new PreferencesStore({ bridge: { read: async () => saved, write }, profiles: new ClientProfileBook([]), report: () => undefined });
  await store.restore(home.manager);
  configure?.(home.manager);
  const stop = store.bind(home.manager);
  const app = renderApp(home);
  stops.push(stop, app.unbind);
  await screen.findByRole("heading", { level: 1 });
  await act(async () => undefined);
  return { home, write, store, close: () => { app.unmount(); app.unbind(); stop(); }, read: () => saved };
}

async function open() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  const menu = await screen.findByRole("menu", { name: "Settings" });
  fireEvent.click(within(menu).getByRole("menuitem", { name: "Appearance" }));
  const appearance = await screen.findByRole("menu", { name: "Appearance" });
  fireEvent.click(within(appearance).getByRole("menuitem", { name: "Customize Theme" }));
  return waitFor(() => {
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    return dialog as HTMLElement;
  });
}

describe("app-wide custom theme editor", () => {
  it("previews real tokens without changing committed choices or writing; rejects invalid color atomically; cancels and reopens cleanly", async () => {
    const test = await setup();
    const original = test.home.manager.getInputs("home");
    const before = test.home.manager.getSnapshot("home");
    await open();
    fireEvent.change(field("color.surface.app"), { target: { value: "#123456" } });
    fireEvent.click(dialogUi().getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--color-surface-app")).toBe("#123456"));
    expect(test.home.manager.getInputs("home")).toBe(original);
    expect(test.home.manager.getSnapshot("editor").tokens["color.surface.app"]).toBe("#123456");
    expect(test.home.manager.getInputs("editor").userTheme).toBeNull();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, SAVE_DEBOUNCE_MS)); });
    expect(test.write).not.toHaveBeenCalled();
    fireEvent.change(field("color.surface.app"), { target: { value: "broken" } });
    fireEvent.click(dialogUi().getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(dialogUi().getByRole("alert").textContent).toContain("color.surface.app"));
    expect(test.home.manager.getSnapshot("home").tokens["color.surface.app"]).toBe("#123456");
    fireEvent.click(dialogUi().getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(test.home.manager.getInputs("home")).toBe(original);
    expect(test.home.manager.getSnapshot("home").tokens).toEqual(before.tokens);
    await open();
    expect((field("color.surface.app") as HTMLInputElement).value).toBe(String(before.tokens["color.surface.app"]));
    test.close();
  });

  it("saves typed custom values and aliases through real preferences and restores them on a fresh manager, without changing bundled presets", async () => {
    const bundled = JSON.stringify(defaults);
    const test = await setup((manager) => {
      expect(manager.setAccessibility("home", { textScale: 1.5, contrast: "normal", reducedMotion: false }).ok).toBe(true);
    });

    await open();
    fireEvent.change(field("font.size.body"), { target: { value: "17" } });
    fireEvent.change(field("color.surface.app"), { target: { value: "{color.accent.primary}" } });
    fireEvent.change(field("font.family.interface"), { target: { value: "serif" } });
    fireEvent.click(dialogUi().getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(test.home.manager.getSnapshot("home").tokens["font.size.body"]).toBe(25.5);
    expect(test.home.manager.getInputs("home").userTheme?.tokens["color.surface.app"]).toBe("{color.accent.primary}");
    await waitFor(() => expect(test.write).toHaveBeenCalledTimes(1));
    const fresh = new ThemeManager(defaults);
    await new PreferencesStore({ bridge: { read: async () => test.read(), write: async () => undefined }, profiles: new ClientProfileBook([]), report: () => undefined }).restore(fresh);
    expect(fresh.getInputs("home")).toEqual(test.home.manager.getInputs("home"));
    expect(fresh.getSnapshot("home").tokens).toEqual(test.home.manager.getSnapshot("home").tokens);
    expect(SCOPE_IDS.map((scope) => fresh.getInputs(scope))).toEqual(SCOPE_IDS.map((scope) => test.home.manager.getInputs(scope)));
    expect(SCOPE_IDS.map((scope) => fresh.getSnapshot(scope).tokens["font.size.body"])).toEqual([17, 17, 17, 25.5]);
    expect(JSON.stringify(defaults)).toBe(bundled);
    vi.useRealTimers();
    await open();
    expect((field("font.size.body") as HTMLInputElement).value).toBe("17");
    expect((field("color.surface.app") as HTMLInputElement).value).toBe("{color.accent.primary}");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Appearance" }));
    await screen.findByRole("menu", { name: "Appearance" });
    const preset = test.home.manager.listPresets().find((entry) => entry.id !== test.home.manager.getInputs("home").presetId);
    expect(preset).toBeDefined();
    fireEvent.click(await screen.findByRole("menuitemradio", { name: preset?.label }));
    await waitFor(() => expect(test.home.manager.getSnapshot("home").themeId).toBe(preset?.id));
    expect(test.home.manager.getInputs("home").userTheme).toBeNull();
    test.close();
    const restarted = renderApp(healthyHome({ theme: fresh }));
    stops.push(restarted.unbind);
    await screen.findByRole("heading", { level: 1 });
    expect(fresh.getSnapshot("home").themeId).toBe("custom-home");
    restarted.unmount();
  });

  it.each(["Escape", "unmount"])("restores exact custom theme, preset and overrides after multiple previews on %s", async (dismissal) => {
    const test = await setup((manager) => {
      expect(manager.setUserTheme("home", { schema: USER_THEME_SCHEMA, id: "existing", tokens: { "color.surface.app": "#246810" } }).ok).toBe(true);
      expect(manager.setOverrides("home", { "color.text.primary": "#ABCDEF" }).ok).toBe(true);
    });
    const original = test.home.manager.getInputs("home");
    const before = test.home.manager.getSnapshot("home");
    await open();
    for (const value of ["#111111", "#222222"]) {
      fireEvent.change(field("color.surface.app"), { target: { value } });
      fireEvent.click(dialogUi().getByRole("button", { name: "Preview" }));
      await waitFor(() => expect(test.home.manager.getSnapshot("home").tokens["color.surface.app"]).toBe(value));
    }
    if (dismissal === "Escape") {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
      await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    } else test.close();
    expect(test.home.manager.getInputs("home")).toBe(original);
    expect(test.home.manager.getSnapshot("home")).toBe(before);
    expect(test.write).not.toHaveBeenCalled();
    if (dismissal === "Escape") test.close();
  });

  it.each(["create", "play", "host"] as const)("opens the actual %s route and binds shared preview tokens app-wide", async (workspace: WorkspaceDestination) => {
    const test = await setup();
    const scope = WORKSPACE_SCOPE[workspace];
    const registry = loadShippedRegistry();
    const other = SCOPE_IDS.filter((entry) => entry !== scope).map((entry) => test.home.manager.getInputs(entry));
    fireEvent.click(screen.getByRole("button", { name: registry.requireControl(SPLASH[workspace]).label }));
    await screen.findByRole("main", { name: registry.requireControl(NAVIGATION[workspace].entries[workspace]).label });
    await open();
    const available = Object.keys(test.home.manager.getEditableTokens(scope));
    const labels = [...document.querySelectorAll(".theme-editor-fields label")].map((label) => label.textContent);
    expect(labels.sort()).toEqual(available.sort());
    fireEvent.change(field("color.surface.app"), { target: { value: "#123456" } });
    if (scope === "client") {
      fireEvent.change(field("text.timestamps"), { target: { value: "true" } });
      await act(async () => undefined);
      fireEvent.change(field("text.ansiColorPolicy"), { target: { value: "ignored" } });
      await act(async () => undefined);
    }
    fireEvent.click(dialogUi().getByRole("button", { name: "Preview" }));
    const root = document.querySelector<HTMLElement>(".theme-scope");
    await waitFor(() => expect(root?.style.getPropertyValue("--color-surface-app")).toBe("#123456"));
    if (scope === "client") {
      expect(test.home.manager.getSnapshot(scope).tokens["text.timestamps"]).toBe(true);
      expect(test.home.manager.getSnapshot(scope).tokens["text.ansiColorPolicy"]).toBe("ignored");
    }
    expect(SCOPE_IDS.filter((entry) => entry !== scope).map((entry) => test.home.manager.getInputs(entry))).toEqual(other);
    act(() => { expect(test.home.manager.setOverrides("home", { "color.surface.app": "#654321" }).ok).toBe(true); });
    expect(root?.style.getPropertyValue("--color-surface-app")).toBe("#123456");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(root?.style.getPropertyValue("--color-surface-app")).toBe(String(test.home.manager.getSnapshot(scope).tokens["color.surface.app"]));
    test.close();
  });

  it("scope change discards preview and cannot reopen an abandoned draft", async () => {
    let runtime: UiRuntime | undefined;
    function Surface() { runtime = useUi(); return null; }
    const test = await setup(undefined, { create: Surface });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await screen.findByRole("main", { name: "Create" });
    const original = test.home.manager.getSnapshot("editor");
    await open();
    fireEvent.change(field("color.surface.app"), { target: { value: "#112233" } });
    fireEvent.click(dialogUi().getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(test.home.manager.getSnapshot("editor").tokens["color.surface.app"]).toBe("#112233"));
    expect(runtime).toBeDefined();
    const registration = runtime?.shortcuts.register({ scope: runtime.focus.top().key, chord: "F8", actionId: "ui.nav.play", owner: "theme-editor-test" });
    expect(registration?.ok).toBe(true);
    if (registration?.ok) stops.push(registration.unregister);
    field("color.surface.app").focus();
    fireEvent.keyDown(field("color.surface.app"), { key: "F8" });
    await act(async () => undefined);
    expect(screen.getByRole("main", { name: "Create" })).toBeTruthy();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    const preview = dialogUi().getByRole("button", { name: "Preview" });
    preview.focus();
    fireEvent.keyDown(preview, { key: "F8" });
    await screen.findByRole("main", { name: "Play" });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(test.home.manager.getSnapshot("editor")).toBe(original);
    await act(async () => { await runtime?.bus.dispatch({ actionId: "ui.nav.create", controlId: NAVIGATION.play.entries.create }); });
    await screen.findByRole("main", { name: "Create" });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await open();
    expect(field("color.surface.app").value).toBe(String(original.tokens["color.surface.app"]));
    test.close();
  });

  it("rejects invalid Save with exact field reason and preserves every committed scope", async () => {
    const test = await setup();
    const original = SCOPE_IDS.map((scope) => test.home.manager.getInputs(scope));
    await open();
    fireEvent.change(field("font.size.body"), { target: { value: "-1" } });
    fireEvent.click(dialogUi().getByRole("button", { name: "Save" }));
    await waitFor(() => expect(dialogUi().getByRole("alert").textContent).toContain("font.size.body"));
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
    expect(field("font.size.body").getAttribute("aria-invalid")).toBe("true");
    expect(SCOPE_IDS.map((scope) => test.home.manager.getInputs(scope))).toEqual(original);
    expect(test.write).not.toHaveBeenCalled();
    test.close();
  });

  it("associates an unknown alias with its edited field for Preview and Save while preserving committed inputs and the valid preview", async () => {
    const test = await setup();
    const original = SCOPE_IDS.map((scope) => test.home.manager.getInputs(scope));
    await open();
    for (const action of ["Preview", "Save"]) {
      const beforePreview = test.home.manager.getSnapshot("home");
      fireEvent.change(field("color.surface.app"), { target: { value: "#123456" } });
      fireEvent.click(dialogUi().getByRole("button", { name: "Preview" }));
      await waitFor(() => expect(test.home.manager.getSnapshot("home")).not.toBe(beforePreview));
      expect(test.home.manager.getSnapshot("home").tokens["color.surface.app"]).toBe("#123456");
      expect(field("color.surface.app").getAttribute("aria-invalid")).toBeNull();
      const validPreview = test.home.manager.getSnapshot("home");
      fireEvent.change(field("color.surface.app"), { target: { value: "{color.notreal}" } });
      fireEvent.click(dialogUi().getByRole("button", { name: action }));
      await waitFor(() => expect(field("color.surface.app").getAttribute("aria-invalid")).toBe("true"));
      const input = field("color.surface.app");
      const error = document.getElementById(input.getAttribute("aria-describedby") ?? "");
      expect(error?.getAttribute("role")).toBe("alert");
      expect(input.parentElement?.contains(error)).toBe(true);
      expect(error?.textContent).toContain('Token "color.notreal" is not part of the theme schema');
      expect(error?.textContent).toContain('referenced by "color.surface.app"');
      expect(test.home.manager.getSnapshot("home")).toBe(validPreview);
      expect(SCOPE_IDS.map((scope) => test.home.manager.getInputs(scope))).toEqual(original);
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, SAVE_DEBOUNCE_MS)); });
    expect(test.write).not.toHaveBeenCalled();
    test.close();
  });

  it("catalog fields match existing schema tokens and all customize routes have exactly the shared action owner", () => {
    const registry = loadShippedRegistry();
    const manager = new ThemeManager(defaults);
    const names = new Set(SCOPE_IDS.flatMap((scope) => Object.keys(manager.getEditableTokens(scope))));
    expect(THEME_TOKEN_CONTROLS.map((entry) => entry.label).sort()).toEqual([...names].sort());
    for (const entry of THEME_TOKEN_CONTROLS) {
      const type = ThemeSchema.describeToken(entry.label)?.type;
      expect(type).toBeDefined();
      expect(entry.kind).toBe(type?.kind === "enum" || type?.kind === "boolean" ? "dropdown" : "input");
    }
    for (const actionId of ["ui.settings.appearance.customize", "ui.editor.themeEdit", "ui.client.themeCustomize"]) expect(registry.action(actionId)?.owner).toBe("HomeIntentRouter");
  });
});
