/** See homeTestSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import { SPLASH, WORKSPACE_ENTRIES } from "./homeLayout";
import { SHELL_INFO, breaksCopyRules, copyOnScreen, healthyHome, liveAnnouncements, renderApp, type TestHome } from "./homeTestSupport";

interface CatalogControl {
  readonly id: string;
  readonly surface: string;
  readonly kind: string;
  readonly label: string;
  readonly tooltip: string;
  readonly actionId: string | null;
  readonly visibleWhen: string;
  readonly testId: string;
}

const splashControls = (homeCatalog.controls as readonly CatalogControl[]).filter((control) => control.surface === "home.splash");
/** Controls whose catalog entry says they show only in some state of the screen, not on the loaded splash. */
const ALWAYS_VISIBLE = "surfaceActive";
const shownOnSplash = splashControls.filter((control) => control.visibleWhen === ALWAYS_VISIBLE);
const ROLE_OF_KIND: Readonly<Record<string, string>> = { button: "button", dropdown: "combobox" };
const control = (id: string): CatalogControl => {
  const found = splashControls.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No splash control ${id}`);
  return found;
};
const elementOf = (id: string): HTMLElement => screen.getByTestId(control(id).testId);

let unbind: (() => void) | null = null;

async function openSplash(home: TestHome = healthyHome()): Promise<TestHome> {
  unbind = renderApp(home).unbind;
  await screen.findByRole("heading", { level: 1 });
  // Input listeners attach in an effect that React may still be holding when the heading first appears.
  await act(async () => undefined);
  return home;
}

afterEach(() => {
  cleanup();
  unbind?.();
  unbind = null;
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-input-modality");
});

function describedBy(element: HTMLElement): string {
  const ids = (element.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id.length > 0);
  return ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
}

/** The checks a rendered action control must pass: test id, name, tooltip help and a native keyboard stop. */
function expectActionControl(entry: CatalogControl): void {
  const element = elementOf(entry.id);
  const role = ROLE_OF_KIND[entry.kind];
  expect(role, `${entry.id} needs a role`).toBeDefined();
  expect(within(document.body).getByRole(role ?? "", { name: entry.label }), entry.id).toBe(element);
  expect(element.getAttribute("data-control-id")).toBe(entry.id);
  expect(["BUTTON", "SELECT"], entry.id).toContain(element.tagName);
  expect(element.tabIndex, entry.id).toBe(0);
  const tooltip = document.getElementById(element.getAttribute("aria-describedby") ?? "");
  expect(tooltip?.getAttribute("role"), entry.id).toBe("tooltip");
  expect(tooltip?.textContent, entry.id).toContain(entry.label);
  expect(tooltip?.textContent, entry.id).toContain(entry.tooltip);
}

describe("every control of the splash surface", () => {
  it("is covered by the layout names, with none left out and none invented", () => {
    expect(Object.values(SPLASH).sort()).toEqual(splashControls.map((candidate) => candidate.id).sort());
  });

  it("is rendered with its catalog test id, name, help and a keyboard path, except the ones the catalog shows only in another state", async () => {
    await openSplash();
    expect(shownOnSplash.length).toBeGreaterThan(0);
    expect(splashControls.length).toBeGreaterThan(shownOnSplash.length);
    for (const entry of shownOnSplash) {
      if (entry.actionId !== null) {
        expectActionControl(entry);
      } else {
        const element = elementOf(entry.id);
        expect(element.textContent, entry.id).toContain(entry.label);
        const help = element.getAttribute("aria-describedby") === null ? element.textContent : describedBy(element);
        expect(help, entry.id).toContain(entry.tooltip);
      }
    }
    for (const entry of splashControls.filter((candidate) => candidate.visibleWhen !== ALWAYS_VISIBLE)) {
      expect(screen.queryByTestId(entry.testId), `${entry.id} shows only when ${entry.visibleWhen}`).toBeNull();
    }
  });

  it("shows the name, version and build from the shell", async () => {
    await openSplash();
    expect(elementOf(SPLASH.name).tagName).toBe("H1");
    expect(elementOf(SPLASH.name).textContent).toBe("MudMaker");
    expect(elementOf(SPLASH.version).textContent).toBe("Version 9.8.7, build abc1234");
  });

  it("lists each startup check with its result in words, the engine as a notice, and the unavailable hosting and connections", async () => {
    await openSplash();
    const status = elementOf(SPLASH.loadingStatus);
    expect(status.tagName).toBe("SECTION");
    const names = within(status)
      .getAllByRole("status")
      .map((item) => item.getAttribute("aria-label"));
    expect(names).toEqual(["Application", "Screen definitions", "Appearance", "Game engine", "Background Hosting", "Connected Worlds"]);
    expect(within(status).getByRole("status", { name: "Game engine" }).textContent).toContain("Needs attention. The game engine is not installed in this build.");
    expect(within(status).getByRole("status", { name: "Application" }).textContent).toContain("Passed.");
    for (const id of [SPLASH.backgroundHosting, SPLASH.connectedWorlds]) {
      expect(elementOf(id).textContent).toContain("Not available in this build yet.");
    }
  });

  it("does not move focus on the first start", async () => {
    await openSplash();
    expect(document.activeElement).toBe(document.body);
  });
});

describe("Create, Play and Host", () => {
  const messageFor = (id: string): string => `${control(id).label} is not available in this build yet.`;

  /** Words a person can see: outside the visually hidden live regions. */
  function visibleCopies(message: string): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>("*")].filter(
      (element) => element.children.length === 0 && element.textContent === message && element.closest(".ui-visually-hidden") === null,
    );
  }

  it.each(WORKSPACE_ENTRIES)("show one visible message and make one announcement for %s, and leave the screen as it was", async (id) => {
    const home = await openSplash();
    const heading = screen.getByRole("heading", { level: 1 });
    const stopsBefore = screen.getAllByRole("button").length;
    fireEvent.click(elementOf(id));
    const message = messageFor(id);
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(1));
    expect(visibleCopies(message)).toHaveLength(1);
    expect(visibleCopies(message)[0]?.closest(".ui-toast")).not.toBeNull();
    expect(document.querySelectorAll(".ui-state-text")).toHaveLength(0);
    const announced = liveAnnouncements(message);
    expect(announced).toHaveLength(1);
    expect(announced[0]?.closest(".ui-visually-hidden")).not.toBeNull();
    expect(home.records).toEqual([
      expect.objectContaining({ code: "no-action-owner", severity: "info", controlId: id, correlation: { launchId: SHELL_INFO.launchId } }),
    ]);
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(stopsBefore + 1);
  });

  it("places the message directly after the three entries and before the next stop in the tab order", async () => {
    await openSplash();
    fireEvent.click(elementOf(SPLASH.host));
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(1));
    const toast = document.querySelector<HTMLElement>(".ui-toast") as HTMLElement;
    const navigation = screen.getByRole("navigation", { name: "Start" });
    expect(navigation.nextElementSibling).toBe(toast);
    const stops = [...document.querySelectorAll<HTMLElement>("button, select")].filter((element) => element.tabIndex >= 0 && element.closest("[hidden]") === null);
    const after = stops.indexOf(within(toast).getByRole("button", { name: "Dismiss" }));
    expect(stops[after - 1]).toBe(elementOf(SPLASH.host));
    expect(stops[after + 1]).toBe(elementOf(SPLASH.recentProjects));
  });

  it("does not stack a second message or a second announcement when the same entry is activated twice in a row, and replaces it for another entry", async () => {
    const home = await openSplash();
    fireEvent.click(elementOf(SPLASH.create));
    fireEvent.click(elementOf(SPLASH.create));
    await waitFor(() => expect(home.records.filter((record) => record.code === "no-action-owner")).toHaveLength(2));
    expect(document.querySelectorAll(".ui-toast")).toHaveLength(1);
    expect(liveAnnouncements(messageFor(SPLASH.create))).toHaveLength(1);
    fireEvent.click(elementOf(SPLASH.play));
    await waitFor(() => expect(document.querySelector(".ui-toast")?.textContent).toContain(messageFor(SPLASH.play)));
    expect(document.querySelectorAll(".ui-toast")).toHaveLength(1);
    expect(document.querySelector(".ui-toast")?.textContent).not.toContain("Create is not available");
    expect(liveAnnouncements("is not available in this build yet")).toHaveLength(1);
  });

  it("keeps one message and one announcement when activations are spread across awaits", async () => {
    const home = await openSplash();
    for (const id of [SPLASH.create, SPLASH.create, SPLASH.host, SPLASH.host]) {
      fireEvent.click(elementOf(id));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve));
      });
      expect(document.querySelectorAll(".ui-toast")).toHaveLength(1);
      expect(liveAnnouncements("is not available in this build yet")).toHaveLength(1);
    }
    expect(home.records.filter((record) => record.code === "no-action-owner")).toHaveLength(4);
    expect(document.querySelector(".ui-toast")?.textContent).toContain(messageFor(SPLASH.host));
  });

  it("clears the message and returns focus to the entry that raised it when it is dismissed", async () => {
    await openSplash();
    fireEvent.click(elementOf(SPLASH.host));
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(1));
    const toast = document.querySelector<HTMLElement>(".ui-toast");
    fireEvent.click(within(toast as HTMLElement).getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(0));
    expect(document.activeElement).toBe(elementOf(SPLASH.host));
    expect(elementOf(SPLASH.host).getAttribute("data-state")).toBe("ready");
  });
});

describe("Recent Projects and Recent Worlds", () => {
  it.each([
    [SPLASH.recentProjects, "No recent projects yet"],
    [SPLASH.recentWorlds, "No recent worlds yet"],
  ])("%s is disabled, stays focusable and explains why in its help", async (id, reason) => {
    const home = await openSplash();
    const element = elementOf(id);
    expect(element.getAttribute("aria-disabled")).toBe("true");
    expect(element.hasAttribute("disabled")).toBe(false);
    const tooltip = document.getElementById(element.getAttribute("aria-describedby") ?? "") as HTMLElement;
    expect(tooltip.textContent).toContain(`Unavailable: ${reason}`);
    expect(tooltip.hidden).toBe(true);
    act(() => element.focus());
    expect(document.activeElement).toBe(element);
    expect(tooltip.hidden).toBe(false);
    fireEvent.click(element);
    expect(document.querySelectorAll(".ui-toast")).toHaveLength(0);
    expect(home.records).toEqual([]);
  });
});

describe("Quit", () => {
  it("asks the shell to close the application once", async () => {
    const home = await openSplash();
    fireEvent.click(elementOf(SPLASH.quit));
    await waitFor(() => expect(home.quit).toHaveBeenCalledTimes(1));
  });
});

describe("page structure and wording", () => {
  it("keeps the tab order Create, Play, Host, Recent Projects, Recent Worlds, appearance, Quit, with no positive tab stops", async () => {
    await openSplash();
    const stops = [...document.querySelectorAll<HTMLElement>("button, select, input, textarea, a[href], [tabindex]")].filter(
      (element) => element.tabIndex >= 0 && element.closest("[hidden]") === null,
    );
    expect(stops.map((element) => element.getAttribute("data-control-id"))).toEqual([
      SPLASH.create,
      SPLASH.play,
      SPLASH.host,
      SPLASH.recentProjects,
      SPLASH.recentWorlds,
      SPLASH.appearance,
      SPLASH.quit,
    ]);
    expect([...document.querySelectorAll("[tabindex]")].filter((element) => Number(element.getAttribute("tabindex")) > 0)).toEqual([]);
  });

  it("has one level one heading and the banner, main and navigation landmarks", async () => {
    await openSplash();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(within(screen.getByRole("navigation", { name: "Start" })).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Create",
      "Play",
      "Host",
    ]);
  });

  it("uses no sprint ids, engineering terms, control ids, emojis or em dashes in the loaded screen, a message, a disabled help and a confirmed change", async () => {
    const home = await openSplash();
    const other = home.manager.listPresets().find((preset) => preset.id !== home.manager.getSnapshot("home").themeId);
    fireEvent.click(elementOf(SPLASH.create));
    fireEvent.click(elementOf(SPLASH.recentProjects));
    fireEvent.change(elementOf(SPLASH.appearance), { target: { value: other?.id ?? "" } });
    await waitFor(() => expect(home.manager.getSnapshot("home").themeId).toBe(other?.id));
    const text = copyOnScreen();
    expect(text).toContain("Create is not available in this build yet.");
    expect(text).toContain("Appearance is now");
    expect(breaksCopyRules(text)).toBe(false);
  });

  it("can tell wording that breaks the rules from wording that follows them", () => {
    for (const bad of ["the sidecar is missing", "S02.3 ready", "wait — now", "all good \u{1F600}", "see home.splash.04", "undefined"]) {
      expect(breaksCopyRules(bad), bad).toBe(true);
    }
    expect(breaksCopyRules("Create is not available in this build yet.")).toBe(false);
  });
});
