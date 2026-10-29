/** See homeTestSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import type { AppInfo } from "../appInfo";
import { ActionRegistry, CatalogLoadError } from "../ui";
import { deferred, fixtureSources } from "../ui/testSupport";
import { SPLASH } from "./homeLayout";
import { SHELL_INFO, breaksCopyRules, copyOnScreen, healthyHome, renderApp, visibleAlert, type TestHome } from "./homeTestSupport";

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
  it("shows a loading state, no splash and no controls, in plain words, then the splash once every check has answered", async () => {
    const info = deferred<AppInfo>();
    const home = healthyHome({ getAppInfo: () => info.promise });
    unbind = renderApp(home).unbind;
    expect(screen.getByRole("progressbar", { name: "Getting MudMaker ready" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(breaksCopyRules(copyOnScreen())).toBe(false);
    info.resolve(SHELL_INFO);
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("starts once under React strict mode: one heading, working controls, no React errors and no duplicate registrations", async () => {
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
    expect(home.records).toEqual([]);
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
    expect(alert.textContent).toContain(label);
    expect(document.activeElement).toBe(alert);
    expect(screen.queryByRole("heading", { name: "MudMaker", level: 1 })).toBeNull();
    const failed = screen.getAllByRole("status").filter((item) => item.textContent?.includes("Failed."));
    expect(failed.map((item) => item.getAttribute("aria-label"))).toEqual([label]);
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

  it("shows Retry as the catalog control with its test id, name, tooltip and a keyboard stop", async () => {
    await openFailed(healthyHome({ getAppInfo: () => Promise.reject(new Error("down")) }));
    const retry = screen.getByRole("button", { name: retryEntry.label });
    expect(retry.getAttribute("data-control-id")).toBe(SPLASH.retry);
    expect(retry.getAttribute("data-testid")).toBe(retryEntry.testId);
    expect(retry.tabIndex).toBe(0);
    const tooltip = document.getElementById(retry.getAttribute("aria-describedby") ?? "");
    expect(tooltip?.getAttribute("role")).toBe("tooltip");
    expect(tooltip?.textContent).toContain(retryEntry.tooltip);
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
    expect(home.records.map((record) => record.code)).toEqual(["startup-shell-failed"]);
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
    await waitFor(() => expect(home.records).toHaveLength(2));
    const alert = await waitFor(visibleAlert);
    await waitFor(() => expect(document.activeElement).toBe(alert));
    expect(home.records.flatMap((record) => ("attempt" in record ? [record.attempt] : []))).toEqual([1, 2]);
    expect(within(alert).queryByText(/still down/)).toBeNull();
  });
});

describe("when the screen definitions are invalid", () => {
  it("says the installation is damaged, moves focus to the alert and offers no control, because trying again cannot fix it", async () => {
    const home = healthyHome({
      loadRegistry: () => {
        throw invalidCatalogError();
      },
    });
    await open(home);
    const alert = await waitFor(visibleAlert);
    expect(alert.textContent).toBe("This copy of MudMaker is damaged. Please reinstall MudMaker, then open it again.");
    expect(document.activeElement).toBe(alert);
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(document.querySelector("[data-control-id]")).toBeNull();
    const text = copyOnScreen();
    expect(text).toContain("Screen definitions");
    expect(breaksCopyRules(text)).toBe(false);
    expect(home.records).toEqual([expect.objectContaining({ code: "startup-catalogs-invalid", severity: "error" })]);
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
