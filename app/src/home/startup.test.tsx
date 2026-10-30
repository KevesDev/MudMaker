/** See homeTestSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import type { AppInfo } from "../appInfo";
import { ActionRegistry, CatalogLoadError } from "../ui";
import { deferred, fixtureSources } from "../ui/testSupport";
import { SPLASH } from "./homeLayout";
import type { HomeDiagnostic } from "./startupChecks";
import { FRAME_TEXT, SHELL_INFO, breaksCopyRules, copyOnScreen, healthyHome, outsideFrame, renderApp, startupRecords, visibleAlert, visibleText, type TestHome } from "./homeTestSupport";

let unbind: (() => void) | null = null;

afterEach(() => {
  cleanup();
  unbind?.();
  unbind = null;
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-input-modality");
  vi.restoreAllMocks();
});

const retryEntry = homeCatalog.controls.find((candidate) => candidate.id === SPLASH.retry);
if (!retryEntry) throw new Error("The catalog must define the Retry control.");

function invalidCatalogError(): CatalogLoadError {
  const sources = fixtureSources();
  const broken = ActionRegistry.create({ ...sources, catalogs: { ...sources.catalogs, home: "not a catalog" } });
  if (broken.ok) throw new Error("The broken catalog must be refused.");
  return new CatalogLoadError(broken.issues);
}

async function open(home: TestHome, options: { readonly strict?: boolean } = {}): Promise<void> {
  unbind = renderApp(home, options).unbind;
  await act(async () => undefined);
}

describe("while the checks run", () => {
  it("shows only the product name and a progress bar that has an accessible name, no screen controls and no words about the checks, then the splash", async () => {
    const info = deferred<AppInfo>();
    const home = healthyHome({ getAppInfo: () => info.promise });
    unbind = renderApp(home).unbind;
    expect(visibleText()).toEqual([...FRAME_TEXT, "MudMaker"]);
    expect(screen.getByRole("progressbar", { name: "Getting MudMaker ready" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(outsideFrame("button")).toEqual([]);
    expect(breaksCopyRules(copyOnScreen())).toBe(false);
    info.resolve(SHELL_INFO);
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("starts once under React strict mode: one heading, a Quit button that works once, no React errors and exactly one log record per check", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const home = healthyHome();
    await open(home, { strict: true });
    await screen.findByRole("heading", { level: 1 });
    await act(async () => undefined);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Quit" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Quit" }));
    await waitFor(() => expect(home.quit).toHaveBeenCalledTimes(1));
    expect(errors).not.toHaveBeenCalled();
    expect(startupRecords(home.records).map((record) => record.check)).toEqual(["shell", "catalogs", "theme", "engine"]);
    expect(home.records).toHaveLength(4);
  });
});

describe("when a check that trying again can fix fails", () => {
  /** The raw text of each failure, which must reach the log and never the screen. */
  const FAILURES = [
    ["the shell does not answer", "Application", "the shell is gone", () => ({ getAppInfo: () => Promise.reject(new Error("the shell is gone")) })],
    ["the engine check cannot run", "Game engine", "no folder", () => ({ getEngineStatus: () => Promise.reject(new Error("no folder")) })],
  ] as const;

  async function openFailed(home: TestHome): Promise<HTMLElement> {
    await open(home);
    return waitFor(visibleAlert);
  }

  it.each(FAILURES)("names the check in plain words, moves focus to the alert and offers Retry when %s", async (_name, label, raw, override) => {
    const home = healthyHome(override());
    const alert = await openFailed(home);
    expect(alert.textContent).toBe(`MudMaker could not start: ${label}.`);
    expect(document.activeElement).toBe(alert);
    expect(screen.queryAllByRole("heading")).toEqual([]);
    expect(visibleText()).toEqual([...FRAME_TEXT, `MudMaker could not start: ${label}.`, "Retry"]);
    const text = copyOnScreen();
    expect(text).not.toContain(raw);
    expect(breaksCopyRules(text)).toBe(false);
    expect(JSON.stringify(home.records)).toContain(raw);
  });

  it("names the appearance check when the active appearance is not a built-in preset", async () => {
    const home = healthyHome();
    const original = home.manager.getSnapshot.bind(home.manager);
    vi.spyOn(home.manager, "getSnapshot").mockImplementation((scope) => ({ ...original(scope), themeId: "no-such-preset" }));
    const alert = await openFailed(home);
    expect(alert.textContent).toContain("Appearance");
    expect(copyOnScreen()).not.toContain("no-such-preset");
    expect(breaksCopyRules(copyOnScreen())).toBe(false);
  });

  it("shows the failure line as the catalog status and nothing of the launch screen", async () => {
    await openFailed(healthyHome({ getAppInfo: () => Promise.reject(new Error("down")) }));
    const status = homeCatalog.controls.find((candidate) => candidate.id === SPLASH.startupStatus);
    expect(screen.getByTestId(status?.testId ?? "missing").getAttribute("role")).toBe("alert");
    const shown = homeCatalog.controls.filter((candidate) => candidate.surface === "home.splash" && document.querySelector(`[data-testid="${candidate.testId}"]`) !== null);
    expect(shown.map((candidate) => candidate.id)).toEqual([SPLASH.startupStatus, SPLASH.retry]);
  });

  it("shows Retry as the catalog control with its test id, name and a keyboard stop, and without a tooltip or description", async () => {
    await openFailed(healthyHome({ getAppInfo: () => Promise.reject(new Error("down")) }));
    const retry = screen.getByRole("button", { name: retryEntry.label, description: "" });
    expect(retry.getAttribute("data-control-id")).toBe(SPLASH.retry);
    expect(retry.getAttribute("data-testid")).toBe(retryEntry.testId);
    expect(retry.tabIndex).toBe(0);
    expect(retry.hasAttribute("aria-describedby")).toBe(false);
    expect(outsideFrame('[role="tooltip"]')).toHaveLength(0);
  });

  it("runs every check again when Retry is clicked, moves focus to the heading on success and logs nothing more", async () => {
    let failing = true;
    const home = healthyHome({ getAppInfo: () => (failing ? Promise.reject(new Error("not yet")) : Promise.resolve(SHELL_INFO)) });
    await openFailed(home);
    failing = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    const heading = await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(home.records.filter((record) => record.severity === "error").map((record) => record.code)).toEqual(["startup-shell-failed"]);
    expect(startupRecords(home.records).map((record) => record.attempt)).toEqual([1, 1, 1, 1, 2, 2, 2, 2]);
  });

  /** A browser turns Enter (on key down) and Space (on key up) on a focused button into a click; jsdom does not, so the test supplies it. */
  it.each([
    ["Enter", "Enter", false],
    ["Space", " ", true],
  ] as const)("is activated once by %s through the shared input manager and not again by a held key", async (_name, key, onKeyUp) => {
    let failing = true;
    const getAppInfo = vi.fn(() => (failing ? Promise.reject(new Error("not yet")) : Promise.resolve(SHELL_INFO)));
    await openFailed(healthyHome({ getAppInfo }));
    const retry = screen.getByRole("button", { name: "Retry" });
    act(() => retry.focus());
    expect(fireEvent.keyDown(retry, { key, repeat: true })).toBe(false);
    expect(getAppInfo).toHaveBeenCalledTimes(1);
    expect(fireEvent.keyDown(retry, { key })).toBe(true);
    if (onKeyUp) fireEvent.keyUp(retry, { key });
    failing = false;
    fireEvent.click(retry);
    await screen.findByRole("heading", { level: 1 });
    expect(getAppInfo).toHaveBeenCalledTimes(2);
  });

  it("keeps the alert, focuses it again and logs the second attempt when Retry fails again", async () => {
    const home = healthyHome({ getAppInfo: () => Promise.reject(new Error("still down")) });
    await openFailed(home);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    const errors = (): HomeDiagnostic[] => home.records.filter((record) => record.severity === "error");
    await waitFor(() => expect(errors()).toHaveLength(2));
    const alert = await waitFor(visibleAlert);
    await waitFor(() => expect(document.activeElement).toBe(alert));
    expect(errors().flatMap((record) => ("attempt" in record ? [record.attempt] : []))).toEqual([1, 2]);
    expect(within(alert).queryByText(/still down/)).toBeNull();
  });
});

describe("when the game engine is not installed", () => {
  it("opens the launch screen and only logs a warning while the engine is not required", async () => {
    const home = healthyHome({ requireEngine: false });
    await open(home);
    expect(await screen.findByRole("heading", { name: "MudMaker", level: 1 })).toBeTruthy();
    expect(visibleAlert).toThrow();
    expect(startupRecords(home.records).filter((record) => record.severity === "warning").map((record) => record.code)).toEqual(["startup-engine-missing"]);
  });

  it("shows the plain failure screen with Retry, naming the game engine, when the engine is required", async () => {
    const home = healthyHome({ requireEngine: true });
    await open(home);
    const alert = await waitFor(visibleAlert);
    expect(alert.textContent).toBe("MudMaker could not start: Game engine.");
    expect(visibleText()).toEqual([...FRAME_TEXT, "MudMaker could not start: Game engine.", "Retry"]);
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "MudMaker", level: 1 })).toBeNull();
    expect(breaksCopyRules(copyOnScreen())).toBe(false);
    expect(startupRecords(home.records).filter((record) => record.severity === "error").map((record) => record.code)).toEqual(["startup-engine-missing"]);
  });
});

describe("when the screen definitions are invalid", () => {
  it("says the installation is damaged, moves focus to the alert and offers no screen control, because trying again cannot fix it", async () => {
    const home = healthyHome({
      loadRegistry: () => {
        throw invalidCatalogError();
      },
    });
    await open(home);
    const alert = await waitFor(visibleAlert);
    expect(alert.textContent).toBe("This copy of MudMaker is damaged. Please reinstall MudMaker, then open it again.");
    expect(document.activeElement).toBe(alert);
    expect(outsideFrame("button")).toEqual([]);
    expect(outsideFrame("[data-control-id]")).toEqual([]);
    expect(visibleText()).toEqual([...FRAME_TEXT, "This copy of MudMaker is damaged. Please reinstall MudMaker, then open it again."]);
    expect(breaksCopyRules(copyOnScreen())).toBe(false);
    expect(home.records.filter((record) => record.severity === "error")).toEqual([expect.objectContaining({ code: "startup-catalogs-invalid" })]);
  });
});

describe("the loading announcement", () => {
  const LABEL = "Getting MudMaker ready";
  const loadingRegions = (): HTMLElement[] => screen.queryAllByRole("status").filter((region) => region.textContent === LABEL);
  const allRegions = (): HTMLElement[] =>
    screen.queryAllByRole("status").filter((region) => region.closest(".ui-visually-hidden") !== null && region.getAttribute("aria-live") === "polite");

  /** Records every change to the document so a test can tell words added to an existing region from a region that arrived with them. */
  function watchDocument(): { readonly drain: () => MutationRecord[]; readonly stop: () => void } {
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((batch) => records.push(...batch));
    observer.observe(document.body, { childList: true, subtree: true });
    return {
      drain: () => {
        records.push(...observer.takeRecords());
        return records.splice(0);
      },
      stop: () => observer.disconnect(),
    };
  }

  const wordsAddedTo = (records: readonly MutationRecord[], region: HTMLElement): boolean =>
    records.some((record) => record.target === region && [...record.addedNodes].some((node) => node.textContent === LABEL));

  it("is empty when it first exists and gets the words afterwards, at launch and again on a retry, as one polite region", async () => {
    const second = deferred<AppInfo>();
    let calls = 0;
    const home = healthyHome({ getAppInfo: () => (++calls === 1 ? Promise.reject(new Error("not yet")) : second.promise) });
    const watch = watchDocument();
    unbind = renderApp(home).unbind;
    const region = loadingRegions()[0] as HTMLElement;
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(wordsAddedTo(watch.drain(), region)).toBe(true);
    expect(loadingRegions()).toEqual([region]);
    await waitFor(visibleAlert);
    expect(region.textContent).toBe("");
    watch.drain();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(region.textContent).toBe(LABEL));
    expect(wordsAddedTo(watch.drain(), region)).toBe(true);
    expect(loadingRegions()).toEqual([region]);
    expect(allRegions().filter((candidate) => candidate !== region && candidate.textContent === LABEL)).toEqual([]);
    second.resolve(SHELL_INFO);
    await screen.findByRole("heading", { level: 1 });
    expect(region.isConnected).toBe(true);
    expect(region.textContent).toBe("");
    watch.stop();
  });

  it("does the same under React strict mode, with still only one region holding the words", async () => {
    const pending = deferred<AppInfo>();
    const home = healthyHome({ getAppInfo: () => pending.promise });
    const watch = watchDocument();
    unbind = renderApp(home, { strict: true }).unbind;
    const regions = loadingRegions();
    expect(regions).toHaveLength(1);
    expect(wordsAddedTo(watch.drain(), regions[0] as HTMLElement)).toBe(true);
    pending.resolve(SHELL_INFO);
    await screen.findByRole("heading", { level: 1 });
    expect(loadingRegions()).toEqual([]);
    watch.stop();
  });
});
