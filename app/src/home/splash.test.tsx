/** See homeTestSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import { FRAME } from "../frame/frameLayout";
import { navCopy } from "../nav/navCopy";
import { ActionBus, loadShippedRegistry, type ControlDescriptor } from "../ui";
import { DEFERRED_CONDITIONS, IMPLEMENTED_CONDITIONS, SPLASH, SPLASH_GLYPHS, WORKSPACE_ENTRIES, isVisible } from "./homeLayout";
import { WORDMARK_ROWS, WORDMARK_TEXT } from "./wordmark";
import { FRAME_TEXT, SHELL_INFO, breaksCopyRules, copyOnScreen, healthyHome, liveAnnouncements, outsideFrame, renderApp, startupRecords, textWithoutArt, visibleText, type TestHome } from "./homeTestSupport";

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
    expect(screen.getByRole("heading", { level: 1, name: "MudMaker" })).toBe(elementOf(SPLASH.name));
    expect(elementOf(SPLASH.version).textContent).toBe("Version 9.8.7, build abc1234");
    for (const id of [SPLASH.name, SPLASH.version]) expect(elementOf(id).hasAttribute("aria-describedby"), id).toBe(false);
    expect([...document.querySelectorAll("header .ui-visually-hidden")].map((hidden) => hidden.textContent)).toEqual(["MudMaker"]);
  });

  it("does not move focus on the first start", async () => {
    await openSplash();
    expect(document.activeElement).toBe(document.body);
  });
});

describe("the loaded screen", () => {
  it("shows exactly the name, version, Create, Play, Host, Settings and Quit and nothing else", async () => {
    await openSplash();
    const { ornament, chevron } = SPLASH_GLYPHS;
    expect(visibleText()).toEqual([
      ...FRAME_TEXT,
      WORDMARK_TEXT.trim(),
      "Version 9.8.7, build abc1234",
      ornament,
      "The Ultimate MUD Suite",
      ...["Create", "Play", "Host"].flatMap((label) => [label, chevron]),
      ornament,
      "Settings",
      "Quit",
    ]);
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

/** A home whose editor service cannot say what leaving would affect, so every switch from the splash is refused and the screen has to say so. */
function refusingHome(): TestHome {
  return healthyHome({
    leaveServices: {
      editor: {
        describeLeaveImpact: () => Promise.reject(new Error("session store unreadable")),
        retainDraft: () => Promise.reject(new Error("not asked")),
        save: () => Promise.reject(new Error("not asked")),
      },
    },
  });
}

describe("Create, Play and Host", () => {
  const MESSAGE = navCopy.checkFailed;

  /** Words a person can see: outside the visually hidden live regions. */
  function visibleCopies(message: string): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>("*")].filter(
      (element) => element.children.length === 0 && element.textContent === message && element.closest(".ui-visually-hidden") === null,
    );
  }

  it.each(WORKSPACE_ENTRIES)("open their workspace from %s and leave no message behind", async (id) => {
    const home = await openSplash();
    fireEvent.click(elementOf(id));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 1 })).toBeNull());
    expect(screen.getByRole("main", { name: control(id).label })).toBeTruthy();
    expect(document.querySelectorAll(".ui-toast")).toHaveLength(0);
    expect(home.records.filter((record) => !("check" in record))).toEqual([]);
  });

  it.each(WORKSPACE_ENTRIES)("show one plain sentence with a reference and make one announcement when %s is refused, and leave the screen as it was", async (id) => {
    const home = await openSplash(refusingHome());
    const heading = screen.getByRole("heading", { level: 1 });
    const stopsBefore = screen.getAllByRole("button").length;
    fireEvent.click(elementOf(id));
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(1));
    expect(visibleCopies(MESSAGE)).toHaveLength(1);
    expect(visibleCopies(MESSAGE)[0]?.closest(".ui-toast")).not.toBeNull();
    expect(document.querySelector(".ui-toast-code")?.textContent).toBe("Reference: leave-check-failed");
    expect(copyOnScreen()).not.toMatch(/Note/);
    expect(document.querySelectorAll(".ui-state-text")).toHaveLength(0);
    const announced = liveAnnouncements(MESSAGE);
    expect(announced).toHaveLength(1);
    expect(announced[0]?.closest(".ui-visually-hidden")).not.toBeNull();
    expect(home.records.filter((record) => !("check" in record))).toEqual([
      expect.objectContaining({ code: "leave-check-failed", severity: "error", detail: "session store unreadable", correlation: { launchId: SHELL_INFO.launchId } }),
    ]);
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(stopsBefore + 1);
  });

  it("places the message directly after the three entries and before the next stop in the tab order", async () => {
    await openSplash(refusingHome());
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

  it("does not stack a second message or a second announcement when the same entry is refused twice in a row, nor for another entry", async () => {
    const home = await openSplash(refusingHome());
    const refusals = (): number => home.records.filter((record) => record.code === "leave-check-failed").length;
    fireEvent.click(elementOf(SPLASH.create));
    await waitFor(() => expect(refusals()).toBe(1));
    fireEvent.click(elementOf(SPLASH.create));
    await waitFor(() => expect(refusals()).toBe(2));
    expect(document.querySelectorAll(".ui-toast")).toHaveLength(1);
    expect(liveAnnouncements(MESSAGE)).toHaveLength(1);
    fireEvent.click(elementOf(SPLASH.play));
    await waitFor(() => expect(refusals()).toBe(3));
    expect(document.querySelectorAll(".ui-toast")).toHaveLength(1);
    expect(liveAnnouncements(MESSAGE)).toHaveLength(1);
  });

  it("clears the message and returns focus to the entry that raised it when it is dismissed", async () => {
    await openSplash(refusingHome());
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
    const held: { bus: ActionBus | null; removers: Map<string, () => void> } = { bus: null, removers: new Map() };
    const register = ActionBus.prototype.registerHandler;
    vi.spyOn(ActionBus.prototype, "registerHandler").mockImplementation(function (this: ActionBus, ...args) {
      held.bus = this;
      const remove = register.apply(this, args);
      held.removers.set(args[1], remove);
      return remove;
    });
    try {
      const home = await openSplash();
      const create = descriptorOf(SPLASH.create);
      const owner = registry.action(create.actionId ?? "")?.owner ?? "";
      held.removers.get(create.actionId ?? "")?.();
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
    const entries = within(screen.getByRole("navigation", { name: "Start" })).getAllByRole("button");
    expect(entries.map(textWithoutArt)).toEqual(["Create", "Play", "Host"].map((label) => `${label}${SPLASH_GLYPHS.chevron}`));
    for (const label of ["Create", "Play", "Host"]) expect(within(screen.getByRole("navigation", { name: "Start" })).getByRole("button", { name: label })).toBeTruthy();
  });

  it("uses no sprint ids, engineering terms, control ids, emojis or em dashes on the loaded screen, in a message and in the open menu", async () => {
    await openSplash(refusingHome());
    fireEvent.click(elementOf(SPLASH.create));
    await waitFor(() => expect(document.querySelectorAll(".ui-toast")).toHaveLength(1));
    fireEvent.click(elementOf(SPLASH.settings));
    expect(await screen.findByRole("menu")).toBeTruthy();
    const text = copyOnScreen();
    expect(text).toContain(navCopy.checkFailed);
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
    expect(breaksCopyRules(navCopy.checkFailed)).toBe(false);
  });
});

describe("the splash composition", () => {
  const bannerIn = (root: ParentNode): HTMLElement => {
    const banners = [...root.querySelectorAll<HTMLElement>(".home-wordmark-art")];
    expect(banners).toHaveLength(1);
    return banners[0] as HTMLElement;
  };

  it("draws the banner as data, hidden from assistive technology, inside the one heading whose readable text is the product name", async () => {
    await openSplash();
    const heading = elementOf(SPLASH.name);
    const banner = bannerIn(document.body);
    expect(banner.closest("h1")).toBe(heading);
    expect(banner.getAttribute("aria-hidden")).toBe("true");
    expect(banner.textContent).toBe(WORDMARK_ROWS.join("\n"));
    expect(banner.textContent).toBe(WORDMARK_TEXT);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect([...heading.children].map((part) => [part.className, part.textContent])).toEqual([
      ["ui-visually-hidden", "MudMaker"],
      ["home-wordmark-art", WORDMARK_TEXT],
    ]);
  });

  it("draws the same banner every time", async () => {
    await openSplash();
    const first = bannerIn(document.body).outerHTML;
    cleanup();
    unbind?.();
    await openSplash();
    expect(bannerIn(document.body).outerHTML).toBe(first);
  });

  it("shows the version and build as one compact string where there is no room beside the banner, in the banner's own box, after it, and never inside the heading", async () => {
    await openSplash();
    const version = elementOf(SPLASH.version);
    const heading = elementOf(SPLASH.name);
    expect(version.parentElement).toBe(heading.parentElement);
    expect(heading.nextElementSibling).toBe(version);
    expect(version.parentElement?.classList.contains("home-wordmark-box")).toBe(true);
    expect(heading.contains(version)).toBe(false);
    expect(version.children).toHaveLength(0);
    expect(version.textContent).toBe("Version 9.8.7, build abc1234");
    expect(version.getAttribute("data-placement")).toBe("below");
  });

  it("draws the wide star divider above the brand line and the narrow one above the footer, hidden from assistive technology", async () => {
    await openSplash();
    const dividers = [...document.querySelectorAll<HTMLElement>(".home-ornament")];
    expect(dividers).toHaveLength(2);
    expect(dividers.map((divider) => divider.getAttribute("data-width"))).toEqual(["wide", "narrow"]);
    for (const divider of dividers) expect(divider.querySelectorAll(".home-rule")).toHaveLength(2);
    for (const divider of dividers) {
      expect(divider.getAttribute("aria-hidden")).toBe("true");
      expect(divider.textContent).toBe(SPLASH_GLYPHS.ornament);
    }
    const tagline = document.querySelector(".home-tagline") as HTMLElement;
    expect(tagline.textContent).toBe("The Ultimate MUD Suite");
    expect(dividers[0]?.nextElementSibling).toBe(tagline);
    expect(dividers[1]?.closest("footer")).not.toBeNull();
    expect(dividers[1]?.nextElementSibling?.classList.contains("home-footer-actions")).toBe(true);
  });

  it("gives Create the primary accent, Play the secondary and Host the tertiary, one entry each", async () => {
    await openSplash();
    const accentOf = (id: string): string | null | undefined => elementOf(id).closest(".home-action")?.getAttribute("data-accent");
    expect([SPLASH.create, SPLASH.play, SPLASH.host].map(accentOf)).toEqual(["primary", "secondary", "tertiary"]);
    expect(document.querySelectorAll(".home-action")).toHaveLength(3);
    expect(document.querySelector(".home-actions")?.getAttribute("data-narrow")).toBe("false");
  });

  it("puts Settings and Quit as text actions in one footer row, apart by a rule that is not a stop", async () => {
    await openSplash();
    const row = document.querySelector(".home-footer-actions") as HTMLElement;
    const parts = [...row.children];
    expect(parts).toHaveLength(3);
    expect(parts[0]?.contains(elementOf(SPLASH.settings))).toBe(true);
    expect(parts[1]?.getAttribute("aria-hidden")).toBe("true");
    expect(parts[1]?.textContent).toBe("");
    expect(parts[2]?.contains(elementOf(SPLASH.quit))).toBe(true);
  });

  it("shows no picture, Active World line or recent list until those have something real to show", async () => {
    await openSplash();
    expect(document.querySelectorAll("img, svg, canvas")).toHaveLength(0);
    const text = copyOnScreen();
    for (const word of ["Active World", "Recent Projects", "Recent Worlds"]) expect(text, word).not.toContain(word);
  });
});
