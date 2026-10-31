import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { healthyHome, renderApp } from "../home/homeTestSupport";
import { CreateShell } from "../editor/CreateShell";
import { HostWorkspace } from "../host/HostWorkspace";
import { PlayWorkspace } from "../play/PlayWorkspace";
import { SCOPE_IDS } from "../theme";

const stops: (() => void)[] = [];
afterEach(() => { cleanup(); for (const stop of stops.splice(0)) stop(); vi.restoreAllMocks(); document.documentElement.removeAttribute("style"); });
async function start(destination: string) {
  const home = healthyHome({ surfaces: { create: CreateShell, play: PlayWorkspace, host: HostWorkspace } });
  const app = renderApp(home); stops.push(app.unbind);
  await screen.findByRole("heading", { level: 1 });
  await act(async () => undefined);
  if (destination !== "Splash") { fireEvent.click(screen.getByRole("button", { name: destination })); await screen.findByRole("main", { name: destination }); }
  return home;
}
async function appearance() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  const root = await screen.findByRole("menu", { name: "Settings" });
  expect(within(root).queryByRole("menuitemradio")).toBeNull();
  fireEvent.click(within(root).getByRole("menuitem", { name: "Appearance" }));
  return screen.findByRole("menu", { name: "Appearance" });
}
describe("owner UI corrections", () => {
  it.each(["Splash", "Create", "Play", "Host"])("selects both themes app-wide from %s's actual nested Appearance", async (destination) => {
    const home = await start(destination);
    for (const preset of [...home.manager.listPresets()].reverse()) {
      const menu = await appearance();
      fireEvent.click(within(menu).getByRole("menuitemradio", { name: preset.label }));
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
      expect(SCOPE_IDS.map((scope) => home.manager.getInputs(scope).presetId)).toEqual(SCOPE_IDS.map(() => preset.id));
      const active = destination === "Splash" ? "home" : destination === "Create" ? "editor" : destination === "Play" ? "client" : "host";
      expect(document.querySelector<HTMLElement>(".theme-scope")?.style.getPropertyValue("--color-surface-app")).toBe(home.manager.getSnapshot(active).tokens["color.surface.app"]);
    }
  });
  it("opens one Output panel, remembers its internal view and explicitly toggles an empty Inspector", async () => {
    await start("Create");
    const viewMenu = async () => { fireEvent.click(screen.getByRole("button", { name: "View" })); return screen.findByRole("menu", { name: "View" }); };
    let menu = await viewMenu();
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent?.trim())).toEqual(["Assets", "Inspector", "Output"]);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Output" }));
    const output = await screen.findByRole("region", { name: "Problems and output" });
    expect(within(output).getByRole("tab", { name: "Problems" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(output).getByRole("tab", { name: "Execution Trace" }));
    await waitFor(() => expect(within(output).getByRole("tab", { name: "Execution Trace" }).getAttribute("aria-selected")).toBe("true"));
    expect(within(output).getByRole("tabpanel", { name: "Execution Trace" })).toBeTruthy();
    menu = await viewMenu(); fireEvent.click(within(menu).getByRole("menuitem", { name: "Output" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Problems and output" })).toBeNull());
    menu = await viewMenu(); fireEvent.click(within(menu).getByRole("menuitem", { name: "Output" }));
    expect(await screen.findByRole("tabpanel", { name: "Execution Trace" })).toBeTruthy();
    for (const expectedOpen of [true, false, true]) {
      menu = await viewMenu(); fireEvent.click(within(menu).getByRole("menuitem", { name: "Inspector" }));
      await waitFor(() => expect(screen.queryByRole("region", { name: "Inspector" }) !== null).toBe(expectedOpen));
    }
    const inspector = screen.getByRole("region", { name: "Inspector" });
    expect(inspector.textContent).toBe("Inspector");
    expect(within(inspector).queryByRole("textbox")).toBeNull();
  });
  it("bounds root and nested Appearance menus at the bottom-right viewport edge", async () => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute("role") === "menu") return new DOMRect(0, 0, 300, 240);
      if (this.getAttribute("aria-haspopup") === "menu") return new DOMRect(window.innerWidth - 30, window.innerHeight - 10, 30, 10);
      return original.call(this);
    });
    await start("Splash");
    await appearance();
    const menus = screen.getAllByRole("menu");
    expect(menus).toHaveLength(2);
    for (const menu of menus) {
      expect(menu.getAttribute("data-positioned")).toBe("true");
      const element = menu as HTMLElement;
      expect(Number.parseFloat(element.style.left)).toBeGreaterThanOrEqual(0);
      expect(Number.parseFloat(element.style.left) + 300).toBeLessThanOrEqual(window.innerWidth);
      expect(Number.parseFloat(element.style.top)).toBeGreaterThanOrEqual(0);
      expect(Number.parseFloat(element.style.top) + 240).toBeLessThanOrEqual(window.innerHeight);
    }
  });
});
