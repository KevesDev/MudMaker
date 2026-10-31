/** Exercises the real application menus. jsdom cannot certify pixels or native pointer feel. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SCOPE_IDS } from "../theme";
import { APPEARANCE_MENU, SPLASH } from "./homeLayout";
import { healthyHome, renderApp, type TestHome } from "./homeTestSupport";
import { loadShippedRegistry } from "../ui";

const registry = loadShippedRegistry();
const label = (id: string) => registry.requireControl(id).label;
let unbind: (() => void) | undefined;
afterEach(() => { cleanup(); unbind?.(); document.documentElement.removeAttribute("style"); });
async function start(home: TestHome = healthyHome()) {
  unbind = renderApp(home).unbind;
  await screen.findByRole("heading", { level: 1 });
  await act(async () => undefined);
  return home;
}
const settings = () => screen.getByRole("button", { name: label(SPLASH.settings) });
async function rootMenu() {
  fireEvent.click(settings());
  return screen.findByRole("menu", { name: label(SPLASH.settings) });
}
async function appearance() {
  const root = await rootMenu();
  fireEvent.click(within(root).getByRole("menuitem", { name: label(APPEARANCE_MENU) }));
  await screen.findByRole("menu", { name: "Appearance" });
  fireEvent.click(screen.getByRole("menuitem", { name: "Theme" }));
  return screen.findByRole("menu", { name: "Theme" });
}

describe("hierarchical Settings and app-wide Appearance", () => {
  it("keeps themes out of root Settings and opens Appearance without changing any inputs", async () => {
    const home = await start();
    const before = SCOPE_IDS.map((scope) => home.manager.getInputs(scope));
    const root = await rootMenu();
    expect(within(root).queryAllByRole("menuitemradio")).toEqual([]);
    expect(within(root).getByRole("menuitem", { name: "Keyboard Help" })).toBeTruthy();
    const opener = within(root).getByRole("menuitem", { name: "Appearance" });
    expect(opener.getAttribute("aria-haspopup")).toBe("menu");
    fireEvent.click(opener);
    const appearance = await screen.findByRole("menu", { name: "Appearance" });
    expect(within(appearance).queryAllByRole("menuitemradio")).toEqual([]);
    fireEvent.click(within(appearance).getByRole("menuitem", { name: "Theme" }));
    const child = await screen.findByRole("menu", { name: "Theme" });
    expect(within(child).getAllByRole("menuitemradio").map((item) => item.getAttribute("data-value"))).toEqual(home.manager.listPresets().map((preset) => preset.id));
    expect(within(child).getByRole("menuitem", { name: "Customize Theme" })).toBeTruthy();
    expect(SCOPE_IDS.map((scope) => home.manager.getInputs(scope))).toEqual(before);
  });
  it("uses ArrowRight/ArrowLeft and Escape to open and close one menu level with correct focus", async () => {
    const home = await start();
    const original = SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope));
    const root = await rootMenu();
    const opener = within(root).getByRole("menuitem", { name: "Appearance" });
    opener.focus();
    fireEvent.keyDown(opener, { key: "ArrowRight" });
    await screen.findByRole("menu", { name: "Appearance" });
    const themeOpener = screen.getByRole("menuitem", { name: "Theme" });
    expect(document.activeElement).toBe(themeOpener);
    fireEvent.keyDown(themeOpener, { key: "ArrowRight" });
    await screen.findByRole("menu", { name: "Theme" });
    expect(document.activeElement?.getAttribute("role")).toBe("menuitemradio");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(document.activeElement).toBe(themeOpener);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "ArrowLeft" });
    expect(screen.queryByRole("menu", { name: "Appearance" })).toBeNull();
    expect(document.activeElement).toBe(opener);
    fireEvent.keyDown(opener, { key: "ArrowRight" });
    await screen.findByRole("menu", { name: "Appearance" });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(document.activeElement).toBe(opener);
    fireEvent.keyDown(opener, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(settings());
    expect(SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope))).toEqual(original);
  });
  it("moves through presets and other Appearance controls using arrow keys", async () => {
    const home = await start();
    const child = await appearance();
    const choices = within(child).getAllByRole("menuitemradio");
    choices[0]?.focus();
    fireEvent.keyDown(choices[0] as HTMLElement, { key: "ArrowDown" });
    expect(document.activeElement).toBe(choices[1]);
    fireEvent.keyDown(choices[1] as HTMLElement, { key: "Home" });
    expect(document.activeElement).toBe(choices[0]);
    fireEvent.keyDown(choices[0] as HTMLElement, { key: "End" });
    expect(document.activeElement).toBe(within(child).getByRole("menuitem", { name: "Customize Theme" }));
    expect(home.manager.getSnapshot("home").themeId).toBe(home.manager.listPresets()[0]?.id);
  });
  it("chooses a theme through pointer/touch, closes the whole chain, updates all scopes and stays silent", async () => {
    const home = await start();
    const target = home.manager.listPresets()[1];
    expect(target).toBeDefined();
    const child = await appearance();
    const item = within(child).getByRole("menuitemradio", { name: target?.label });
    fireEvent.pointerDown(item, { pointerType: "touch", pointerId: 1 });
    fireEvent.pointerUp(item, { pointerType: "touch", pointerId: 1 });
    fireEvent.click(item);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope).themeId)).toEqual(SCOPE_IDS.map(() => target?.id));
    expect(document.activeElement).toBe(settings());
    expect(document.querySelector(".ui-toast")).toBeNull();
    const reopened = await appearance();
    expect(within(reopened).getAllByRole("menuitemradio").filter((entry) => entry.getAttribute("aria-checked") === "true").map((entry) => entry.getAttribute("data-value"))).toEqual([target?.id]);
  });
  it("refuses a theme atomically and exposes a dismissible reason with focus returned to Settings", async () => {
    const home = await start();
    const before = SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope));
    vi.spyOn(home.manager, "selectApplicationPreset").mockReturnValue({ ok: false, errors: [{ code: "out-of-range", token: "color.text.primary", message: "Refused for the test." }] });
    const child = await appearance();
    fireEvent.click(within(child).getByRole("menuitemradio", { name: home.manager.listPresets()[1]?.label }));
    await waitFor(() => expect(document.querySelector(".ui-toast")?.textContent).toContain("Your current look is unchanged."));
    expect(SCOPE_IDS.map((scope) => home.manager.getSnapshot(scope))).toEqual(before);
    const toast = document.querySelector<HTMLElement>(".ui-toast") as HTMLElement;
    fireEvent.click(within(toast).getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(document.querySelector(".ui-toast")).toBeNull());
    expect(document.activeElement).toBe(settings());
  });
  it("toggles root Settings closed and keeps ordinary labelled menu controls free of tooltips", async () => {
    await start();
    await rootMenu();
    fireEvent.click(settings());
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(settings().getAttribute("aria-expanded")).toBe("false");
    expect(settings().getAttribute("aria-describedby")).toBeNull();
  });
});
