/** See homeTestSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import { FRAME } from "../frame/frameLayout";
import { ActionBus, loadShippedRegistry, type ControlDescriptor } from "../ui";
import { DEFERRED_CONDITIONS, IMPLEMENTED_CONDITIONS, SPLASH, WORKSPACE_ENTRIES, isVisible } from "./homeLayout";
import { FRAME_TEXT, SHELL_INFO, breaksCopyRules, copyOnScreen, healthyHome, liveAnnouncements, outsideFrame, renderApp, startupRecords, visibleText, type TestHome } from "./homeTestSupport";

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

const registry = loadShippedRegistry();
const splashControls = (homeCatalog.controls as readonly CatalogControl[]).filter((control) => control.surface === "home.splash");
const descriptorOf = (id: string): ControlDescriptor => registry.requireControl(id);
/** The catalog's own word for "shown whenever the screen is": the oracle for what the loaded screen renders. */
const ALWAYS_SHOWN = "surfaceActive";
const shownOnLoadedSplash = splashControls.filter((control) => control.visibleWhen === ALWAYS_SHOWN);
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

/** The checks a rendered action button must pass: test id, name, a native keyboard stop and no description, since the screen gives it no reason for a tooltip. */
function expectActionButton(entry: CatalogControl): void {
  const element = elementOf(entry.id);
  expect(within(document.body).getByRole("button", { name: entry.label, description: "" }), entry.id).toBe(element);
  expect(element.getAttribute("data-control-id")).toBe(entry.id);
  expect(element.tagName, entry.id).toBe("BUTTON");
  expect(element.tabIndex, entry.id).toBe(0);
  expect(element.hasAttribute("aria-describedby"), entry.id).toBe(false);
}

describe("every control of the splash surface", () => {
  const named: readonly string[] = Object.values(SPLASH);
  const unnamed = splashControls.filter((entry) => !named.includes(entry.id));

  it("is covered by the layout names, or waits for a condition the layout lists as deferred", () => {
    const catalogIds = splashControls.map((entry) => entry.id);
    expect(named.filter((id) => !catalogIds.includes(id))).toEqual([]);
    expect(unnamed.length).toBeGreaterThan(0);
    expect(unnamed.filter((entry) => !DEFERRED_CONDITIONS.includes(entry.visibleWhen)).map((entry) => entry.id)).toEqual([]);
  });

  it("uses only conditions the layout implements or defers, and never one of them as both", () => {
    const used = [...new Set(splashControls.map((entry) => entry.visibleWhen))].sort();
    expect(used).toEqual([...IMPLEMENTED_CONDITIONS, ...DEFERRED_CONDITIONS].sort());
    expect(IMPLEMENTED_CONDITIONS.filter((name) => DEFERRED_CONDITIONS.includes(name))).toEqual([]);
  });

  it("refuses a visibility condition the home screen does not define, instead of hiding the control without saying so", () => {
    expect(() => isVisible({ ...descriptorOf(SPLASH.create), visibleWhen: "invented" }, "ready")).toThrow(/invented/);
    expect(() => isVisible({ ...descriptorOf(SPLASH.create), visibleWhen: "constructor" }, "ready")).toThrow(/constructor/);
  });

  it("never shows a control under a deferred condition, in any phase", () => {
    for (const entry of unnamed) {
      for (const phase of ["ready", "failed"] as const) {
        expect(isVisible(descriptorOf(entry.id), phase), `${entry.id} in ${phase}`).toBe(false);
      }
    }
  });

  it("is rendered with its catalog test id, name and a keyboard path exactly when the catalog shows it on the loaded screen, with no tooltip", async () => {
    await openSplash();
    expect(outsideFrame('[role="tooltip"]')).toHaveLength(0);
    for (const entry of shownOnLoadedSplash) expect(document.body.textContent, entry.id).not.toContain(entry.tooltip);
    expect(shownOnLoadedSplash.map((entry) => entry.id)).toEqual([SPLASH.name, SPLASH.version, ...WORKSPACE_ENTRIES, SPLASH.quit, SPLASH.settings]);
    expect(shownOnLoadedSplash.every((entry) => isVisible(descriptorOf(entry.id), "ready"))).toBe(true);
    for (const entry of shownOnLoadedSplash) {
      if (entry.id === SPLASH.settings) {
        const opener = elementOf(entry.id);
        expect(within(document.body).getByRole("button", { name: entry.label })).toBe(opener);
        expect(opener.getAttribute("aria-haspopup")).toBe("menu");
        expect(opener.hasAttribute("aria-describedby")).toBe(false);
      } else if (entry.actionId !== null) {
        expectActionButton(entry);
      } else {
        expect(elementOf(entry.id).textContent, entry.id).not.toBe("");
      }
    }
    for (const entry of splashControls.filter((candidate) => !shownOnLoadedSplash.includes(candidate))) {
      expect(screen.queryByTestId(entry.testId), `${entry.id} shows only when ${entry.visibleWhen}`).toBeNull();
      expect(document.querySelector(`[data-control-id="${entry.id}"]`), entry.id).toBeNull();
    }
  });

  it("shows the name, version and build from the shell as plain text with no hidden help", async () => {
    await openSplash();
    expect(elementOf(SPLASH.name).tagName).toBe("H1");
    expect(elementOf(SPLASH.name).textContent).toBe("MudMaker");
    expect(elementOf(SPLASH.version).textContent).toBe("Version 9.8.7, build abc1234");
    for (const id of [SPLASH.name, SPLASH.version]) expect(elementOf(id).hasAttribute("aria-describedby"), id).toBe(false);
    expect(document.querySelectorAll("header .ui-visually-hidden")).toHaveLength(0);
  });

  it("does not move focus on the first start", async () => {
    await openSplash();
    expect(document.activeElement).toBe(document.body);
  });
});

describe("the loaded screen", () => {
  it("shows exactly the name, version, Create, Play, Host, Settings and Quit and nothing else", async () => {
    await openSplash();
    expect(visibleText()).toEqual([...FRAME_TEXT, "MudMaker", "Version 9.8.7, build abc1234", "Create", "Play", "Host", "Settings", "Quit"]);
  });

  it("can tell a screen that shows more than its inventory from one that does not", async () => {
    await openSplash();
    const stray = document.createElement("p");
    stray.textContent = "Passed.";
    document.body.append(stray);
    expect(visibleText()).toContain("Passed.");
    stray.remove();
  });

  it("shows no check result, check name, control id or engine wording, while every check is in the log with the launch id", async () => {
    const home = await openSplash();
    const text = copyOnScreen();
    for (const word of ["Passed", "Needs attention", "Failed", "Application", "Screen definitions", "Game engine", "not installed", "Startup Error", "Appearance", "saved"]) {
      expect(text, word).not.toContain(word);
    }
    expect(text).not.toMatch(/\b(home|editor|client|host)\.[a-zA-Z]+\.\d{2}\b/);
    expect(startupRecords(home.records).map((record) => [record.check, record.severity])).toEqual([
      ["shell", "info"],
      ["catalogs", "info"],
      ["theme", "info"],
      ["engine", "warning"],
    ]);
    expect(home.records.every((record) => record.correlation.launchId === SHELL_INFO.launchId)).toBe(true);
  });

  it("has no selector, appearance heading or not-saved note in the page", async () => {
    await openSplash();
    expect(screen.queryAllByRole("combobox")).toEqual([]);
    expect(screen.queryAllByRole("heading", { level: 2 })).toEqual([]);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("Create, Play and Host", () => {
  const messageFor = (id: string): string => `${control(id).label} is not available yet.`;

  /** Words a person can see: outside the visually hidden live regions. */
  function visibleCopies(message: string): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>("*")].filter(
      (element) => element.children.length === 0 && element.textContent === message && element.closest(".ui-visually-hidden") === null,
    );
  }

  it.each(WORKSPACE_ENTRIES)("show one plain sentence and make one announcement for %s, and leave the screen as it was", async (id) => {
    const home = await openSplash();
    const heading = screen.getByRole("heading", { level: 1 });
    const stopsBefore = screen.getAllByRole("button").length;
    fireEvent.click(elementOf(id));
    const message = messageFor(id);
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(1));
    expect(visibleCopies(message)).toHaveLength(1);
    expect(visibleCopies(message)[0]?.closest(".ui-toast")).not.toBeNull();
    expect(document.querySelector(".ui-toast")?.textContent?.startsWith(message)).toBe(true);
    expect(copyOnScreen()).not.toMatch(/Note/);
    expect(document.querySelectorAll(".ui-state-text")).toHaveLength(0);
    const announced = liveAnnouncements(message);
    expect(announced).toHaveLength(1);
    expect(announced[0]?.closest(".ui-visually-hidden")).not.toBeNull();
    expect(home.records.filter((record) => !("check" in record))).toEqual([
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
    expect(stops[after + 1]).toBe(elementOf(SPLASH.settings));
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
    expect(liveAnnouncements("is not available yet")).toHaveLength(1);
  });

  it("keeps one message and one announcement when activations are spread across awaits", async () => {
    const home = await openSplash();
    for (const id of [SPLASH.create, SPLASH.create, SPLASH.host, SPLASH.host]) {
      fireEvent.click(elementOf(id));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve));
      });
      expect(document.querySelectorAll(".ui-toast")).toHaveLength(1);
      expect(liveAnnouncements("is not available yet")).toHaveLength(1);
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

describe("an owner that answers a failure with no words", () => {
  const SAFE_SENTENCE = "Create did not finish. Please try again.";

  it.each([
    ["an empty message", ""],
    ["a message of only spaces", "   "],
  ])("keeps the screen, shows the plain sentence once and announces it once for %s", async (_name, message) => {
    const held: { bus: ActionBus | null } = { bus: null };
    const register = ActionBus.prototype.registerHandler;
    vi.spyOn(ActionBus.prototype, "registerHandler").mockImplementation(function (this: ActionBus, ...args) {
      held.bus = this;
      return register.apply(this, args);
    });
    try {
      const home = await openSplash();
      const create = descriptorOf(SPLASH.create);
      const owner = registry.action(create.actionId ?? "")?.owner ?? "";
      held.bus?.registerHandler(owner, create.actionId ?? "", () => Promise.resolve({ status: "recoverable-error", code: "E-BLANK", message }));
      const heading = screen.getByRole("heading", { level: 1 });
      fireEvent.click(elementOf(SPLASH.create));
      await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(1));
      expect(document.querySelector(".ui-toast")?.textContent?.startsWith(SAFE_SENTENCE)).toBe(true);
      expect(screen.getByRole("heading", { level: 1 })).toBe(heading);
      expect(liveAnnouncements(SAFE_SENTENCE)).toHaveLength(1);
      expect(home.records.filter((record) => !("check" in record)).map((record) => record.code)).toEqual(["handler-invalid-outcome"]);
    } finally {
      vi.restoreAllMocks();
    }
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
  it("keeps the tab order Minimize, Maximize, Close, Create, Play, Host, Settings, Quit, with no positive tab stops", async () => {
    await openSplash();
    const stops = [...document.querySelectorAll<HTMLElement>("button, select, input, textarea, a[href], [tabindex]")].filter(
      (element) => element.tabIndex >= 0 && element.closest("[hidden]") === null,
    );
    expect(stops.map((element) => element.getAttribute("data-testid"))).toEqual(
      [...[FRAME.minimize, FRAME.maximize, FRAME.close].map((id) => descriptorOf(id).testId), ...[SPLASH.create, SPLASH.play, SPLASH.host, SPLASH.settings, SPLASH.quit].map((id) => control(id).testId)],
    );
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

  it("uses no sprint ids, engineering terms, control ids, emojis or em dashes on the loaded screen, in a message and in the open menu", async () => {
    await openSplash();
    fireEvent.click(elementOf(SPLASH.create));
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(1));
    fireEvent.click(elementOf(SPLASH.settings));
    expect(await screen.findByRole("menu")).toBeTruthy();
    const text = copyOnScreen();
    expect(text).toContain("Create is not available yet.");
    expect(breaksCopyRules(text)).toBe(false);
  });

  it("can tell wording that breaks the rules from wording that follows them", () => {
    for (const bad of [
      "the sidecar is missing",
      "S02.3 ready",
      "wait — now",
      "all good \u{1F600}",
      "see home.splash.04",
      "undefined",
      "readable by assistive technology",
      "Show the exact installed semantic version and build identifier",
      "Show startup validation, profile recovery and real errors",
      "Choose the appearance preset in Settings > Appearance",
    ]) {
      expect(breaksCopyRules(bad), bad).toBe(true);
    }
    expect(breaksCopyRules("Create is not available yet.")).toBe(false);
  });
});
