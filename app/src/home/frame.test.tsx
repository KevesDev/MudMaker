/** See homeTestSupport.tsx for what these tests cannot prove. A fake window stands in for the shell, so dragging and real resizing are checked by hand. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { frameCopy } from "../frame/frameCopy";
import { FRAME, GLYPHS } from "../frame/frameLayout";
import { loadShippedRegistry } from "../ui";
import type { AppInfo } from "../appInfo";
import { deferred } from "../ui/testSupport";
import { homeCopy } from "./homeCopy";
import { SHELL_INFO, healthyHome, liveAnnouncements, renderApp, type TestHome } from "./homeTestSupport";

const registry = loadShippedRegistry();
const entry = (id: string) => registry.requireControl(id);
const frame = (): HTMLElement => {
  const found = document.querySelector<HTMLElement>(".app-frame");
  if (!found) throw new Error("The window frame is missing.");
  return found;
};
const button = (id: string): HTMLElement => within(frame()).getByTestId(entry(id).testId);
/** Long enough that a read started after the screen changes cannot have answered by the time the test looks. */
const SLOW_READ_MS = 50;
const settle = (): Promise<void> => act(async () => new Promise((resolve) => setTimeout(resolve)));

let unbind: (() => void) | null = null;

async function openApp(home: TestHome = healthyHome(), options: { readonly strict?: boolean } = {}): Promise<TestHome> {
  unbind = renderApp(home, options).unbind;
  await screen.findByRole("heading", { level: 1 });
  // Input listeners attach in an effect that React may still be holding when the heading first appears.
  await settle();
  return home;
}

afterEach(() => {
  cleanup();
  unbind?.();
  unbind = null;
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-input-modality");
});

describe("the frame row on the loaded screen", () => {
  it("shows exactly the title and three controls, in the order Minimize, Maximize, Close", async () => {
    await openApp();
    const text = [...frame().querySelectorAll("*")]
      .filter((element) => element.children.length === 0 && !element.closest("[role='tooltip']") && element.textContent !== "")
      .map((element) => element.textContent);
    expect(frame().querySelector(".app-frame-middle")?.childElementCount).toBe(0);
    expect(frame().querySelector(".app-frame-end")).toBeNull();
    expect(text).toEqual([entry(FRAME.title).label, GLYPHS.minimize, GLYPHS.maximize, GLYPHS.close]);
    expect(within(frame()).getAllByRole("button").map((control) => control.getAttribute("aria-label"))).toEqual([
      entry(FRAME.minimize).label,
      entry(FRAME.maximize).label,
      entry(FRAME.close).label,
    ]);
    expect(frame().previousElementSibling).toBeNull();
  });

  it("gives each control its catalog test id and control id, a native keyboard stop, and the glyph hidden from assistive technology", async () => {
    await openApp();
    for (const id of [FRAME.minimize, FRAME.maximize, FRAME.close]) {
      const control = button(id);
      expect(control.tagName, id).toBe("BUTTON");
      expect(control.getAttribute("data-control-id"), id).toBe(id);
      expect(control.getAttribute("data-testid"), id).toBe(entry(id).testId);
      expect(control.tabIndex, id).toBe(0);
      expect(control.querySelector("[aria-hidden='true']")?.textContent, id).not.toBe("");
    }
  });

  it("names every control with a tooltip that is its name, hidden until asked for, because the control shows no words", async () => {
    await openApp();
    const tips = within(frame()).getAllByRole("tooltip", { hidden: true });
    expect(tips.map((tip) => tip.textContent)).toEqual([entry(FRAME.minimize).label, entry(FRAME.maximize).label, entry(FRAME.close).label]);
    expect(tips.every((tip) => tip.hidden)).toBe(true);
    for (const id of [FRAME.minimize, FRAME.maximize, FRAME.close]) expect(button(id).hasAttribute("aria-describedby"), id).toBe(false);
    act(() => button(FRAME.close).focus());
    await waitFor(() => expect(tips[2]?.hidden).toBe(false));
  });

  it("is the first thing in the tab order, ahead of the screen", async () => {
    await openApp();
    const stops = [...document.querySelectorAll<HTMLElement>("button")].filter((element) => element.tabIndex >= 0);
    expect(stops.slice(0, 3).map((element) => element.getAttribute("data-control-id"))).toEqual([FRAME.minimize, FRAME.maximize, FRAME.close]);
  });
});

describe("the drag region", () => {
  it("is declared on the row for everything that is not a control, and no control carries it", async () => {
    await openApp();
    expect(frame().getAttribute("data-tauri-drag-region")).toBe("deep");
    for (const id of [FRAME.minimize, FRAME.maximize, FRAME.close]) {
      expect(button(id).closest("[data-tauri-drag-region='false']"), id).toBeNull();
      expect(button(id).hasAttribute("data-tauri-drag-region"), id).toBe(false);
      expect(button(id).querySelector("[data-tauri-drag-region]"), id).toBeNull();
    }
    expect(document.querySelectorAll("[data-tauri-drag-region]")).toHaveLength(1);
  });

  it("leaves a double click on the row to the shell, with no handler of the screen's own that would toggle a second time", async () => {
    const home = await openApp();
    fireEvent.doubleClick(frame());
    fireEvent.doubleClick(frame().querySelector(".app-frame-title") as HTMLElement);
    await settle();
    expect(home.windowShell.toggleMaximize).not.toHaveBeenCalled();
  });
});

describe("Minimize", () => {
  it("is a native button that key presses leave alone, so the browser's own click for Enter or Space runs the action once", async () => {
    const home = await openApp();
    for (const id of [FRAME.minimize, FRAME.maximize, FRAME.close]) {
      expect(button(id).tagName, id).toBe("BUTTON");
      expect(button(id).getAttribute("type"), id).toBe("button");
    }
    const control = button(FRAME.minimize);
    // fireEvent returns false when a listener prevented the default action, which is what would stop the browser's click.
    expect(fireEvent.keyDown(control, { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(control, { key: " " })).toBe(true);
    expect(fireEvent.keyUp(control, { key: " " })).toBe(true);
    await settle();
    expect(home.windowShell.minimize).not.toHaveBeenCalled();
    fireEvent.click(control);
    await waitFor(() => expect(home.windowShell.minimize).toHaveBeenCalledTimes(1));
    expect(liveAnnouncements("Done")).toEqual([]);
  });

  it("shows its error beside the control and logs one record with the launch id when the window refuses", async () => {
    const home = await openApp();
    home.windowShell.minimize.mockRejectedValueOnce(new Error("window denied"));
    fireEvent.click(button(FRAME.minimize));
    await waitFor(() => expect(button(FRAME.minimize).getAttribute("data-state")).toBe("recoverable-error"));
    expect(within(frame()).getByText("Minimize did not finish. Please try again.")).toBeTruthy();
    expect(home.records.filter((record) => !("check" in record))).toEqual([
      expect.objectContaining({ severity: "error", code: "handler-failed", controlId: FRAME.minimize, detail: "window denied", correlation: { launchId: SHELL_INFO.launchId } }),
    ]);
  });
});

describe("Maximize and Restore", () => {
  it("changes its name and glyph only when the window reports the change, and keeps keyboard focus on the same element", async () => {
    const home = await openApp();
    const toggle = button(FRAME.maximize);
    act(() => toggle.focus());
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute("aria-label")).toBe(entry(FRAME.restore).label));
    expect(home.windowShell.toggleMaximize).toHaveBeenCalledTimes(1);
    expect(button(FRAME.restore)).toBe(toggle);
    expect(toggle.getAttribute("data-control-id")).toBe(FRAME.restore);
    expect(toggle.textContent).toBe(GLYPHS.restore);
    expect(document.activeElement).toBe(toggle);
    expect(liveAnnouncements("The window now fills the screen.")).toHaveLength(1);
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute("aria-label")).toBe(entry(FRAME.maximize).label));
    expect(toggle.textContent).toBe(GLYPHS.maximize);
    expect(home.windowShell.toggleMaximize).toHaveBeenCalledTimes(2);
  });

  it("follows a window that was maximized or restored without the control, and starts right when the window opens maximized", async () => {
    const home = await openApp(healthyHome());
    home.windowShell.changeOutside(true);
    await waitFor(() => expect(within(frame()).getByRole("button", { name: entry(FRAME.restore).label })).toBeTruthy());
    expect(within(frame()).queryByRole("button", { name: entry(FRAME.maximize).label })).toBeNull();
    home.windowShell.changeOutside(false);
    await waitFor(() => expect(within(frame()).getByRole("button", { name: entry(FRAME.maximize).label })).toBeTruthy());
  });

  it("shows the real mode of a window that was already maximized when the screen appeared", async () => {
    const shell = healthyHome().windowShell;
    shell.changeOutside(true);
    await openApp(healthyHome({ windowShell: shell }));
    await waitFor(() => expect(within(frame()).getByRole("button", { name: entry(FRAME.restore).label })).toBeTruthy());
  });

  it("keeps the old name and shows an error when the window refuses, instead of guessing the change", async () => {
    const home = await openApp();
    home.windowShell.toggleMaximize.mockRejectedValueOnce(new Error("toggle denied"));
    fireEvent.click(button(FRAME.maximize));
    await waitFor(() => expect(button(FRAME.maximize).getAttribute("data-state")).toBe("recoverable-error"));
    expect(button(FRAME.maximize).getAttribute("aria-label")).toBe(entry(FRAME.maximize).label);
    expect(liveAnnouncements("The window now fills the screen.")).toEqual([]);
  });

  it("logs a window whose mode can no longer be read once, with the launch id, however many changes follow, and keeps the last name", async () => {
    const home = await openApp();
    home.windowShell.isMaximized.mockRejectedValue(new Error("no window"));
    for (let index = 0; index < 4; index += 1) {
      home.windowShell.changeOutside(index % 2 === 0);
      await settle();
    }
    const records = home.records.filter((record) => record.code === "window-state-unreadable");
    expect(records).toHaveLength(1);
    expect(records[0]?.correlation).toEqual({ launchId: SHELL_INFO.launchId });
    expect(button(FRAME.maximize).getAttribute("aria-label")).toBe(entry(FRAME.maximize).label);
  });

  it("shows Restore at once, with no wait for a new read, across the loading-to-ready switch and across Retry, for a window that is maximized", async () => {
    const second = deferred<AppInfo>();
    let calls = 0;
    const home = healthyHome({
      getAppInfo: () => {
        calls += 1;
        return calls === 1 ? Promise.reject(new Error("shell down")) : second.promise;
      },
    });
    home.windowShell.changeOutside(true);
    home.windowShell.isMaximized.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), SLOW_READ_MS)));
    unbind = renderApp(home).unbind;
    const retry = await screen.findByRole("button", { name: "Retry" });
    await waitFor(() => expect(within(frame()).getByRole("button", { name: entry(FRAME.restore).label })).toBeTruthy());
    await settle();
    fireEvent.click(retry);
    await screen.findByRole("progressbar");
    expect(within(frame()).getByRole("button", { name: entry(FRAME.restore).label })).toBeTruthy();
    second.resolve(SHELL_INFO);
    await screen.findByRole("heading", { level: 1 });
    expect(within(frame()).getByRole("button", { name: entry(FRAME.restore).label })).toBeTruthy();
    expect(within(frame()).queryByRole("button", { name: entry(FRAME.maximize).label })).toBeNull();
  });

  it("keeps one listener on the window under development double mounting, and none after the screen is gone", async () => {
    const home = await openApp(healthyHome(), { strict: true });
    expect(home.windowShell.listenerCount()).toBe(1);
    cleanup();
    await settle();
    expect(home.windowShell.listenerCount()).toBe(0);
  });
});

describe("Close", () => {
  it("runs the same quit as Quit, once for each, and announces the same closing sentence", async () => {
    const home = await openApp();
    fireEvent.click(button(FRAME.close));
    await waitFor(() => expect(home.quit).toHaveBeenCalledTimes(1));
    expect(liveAnnouncements("Closing MudMaker.")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: entry("home.splash.11").label }));
    await waitFor(() => expect(home.quit).toHaveBeenCalledTimes(2));
  });

  it("shows an error and no closing announcement when quitting fails", async () => {
    const home = healthyHome();
    home.quit.mockRejectedValueOnce(new Error("the shell would not exit"));
    await openApp(home);
    fireEvent.click(button(FRAME.close));
    await waitFor(() => expect(button(FRAME.close).getAttribute("data-state")).toBe("recoverable-error"));
    expect(liveAnnouncements("Closing MudMaker.")).toEqual([]);
  });

  it("does not run the quit twice for two quick clicks", async () => {
    const home = await openApp();
    fireEvent.click(button(FRAME.close));
    fireEvent.click(button(FRAME.close));
    await settle();
    expect(home.quit).toHaveBeenCalledTimes(1);
  });
});

describe("the frame while the screen starts", () => {
  it("shows its three window controls while the checks run, and Close and Minimize work before the screen exists", async () => {
    const info = deferred<AppInfo>();
    const home = healthyHome({ getAppInfo: () => info.promise });
    unbind = renderApp(home).unbind;
    await settle();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(within(frame()).getAllByRole("button").map((control) => control.getAttribute("data-control-id"))).toEqual([FRAME.minimize, FRAME.maximize, FRAME.close]);
    fireEvent.click(button(FRAME.minimize));
    await waitFor(() => expect(home.windowShell.minimize).toHaveBeenCalledTimes(1));
    fireEvent.click(button(FRAME.close));
    await waitFor(() => expect(home.quit).toHaveBeenCalledTimes(1));
    info.resolve(SHELL_INFO);
    await screen.findByRole("heading", { level: 1 });
    expect(within(frame()).getAllByRole("button")).toHaveLength(3);
  });

  it("shows the same controls and still closes after a damaged install, with the launch id on a failure", async () => {
    const home = healthyHome({
      loadRegistry: () => {
        throw new Error("catalog broken");
      },
    });
    unbind = renderApp(home).unbind;
    await waitFor(() => expect(screen.getByText(/damaged/)).toBeTruthy());
    await settle();
    expect(frame().getAttribute("data-tauri-drag-region")).toBe("deep");
    expect(within(frame()).getAllByRole("button").map((control) => control.getAttribute("data-control-id"))).toEqual([FRAME.minimize, FRAME.maximize, FRAME.close]);
    home.windowShell.minimize.mockRejectedValueOnce(new Error("window denied"));
    fireEvent.click(button(FRAME.minimize));
    await waitFor(() => expect(home.records.some((record) => record.code === "handler-failed")).toBe(true));
    expect(home.records.find((record) => record.code === "handler-failed")?.correlation).toEqual({ launchId: SHELL_INFO.launchId });
    fireEvent.click(button(FRAME.close));
    await waitFor(() => expect(home.quit).toHaveBeenCalledTimes(1));
  });

  it("uses the same catalog title in every state, so the loading and damaged frames name the window as the loaded one does", async () => {
    const info = deferred<AppInfo>();
    const home = healthyHome({ getAppInfo: () => info.promise });
    unbind = renderApp(home).unbind;
    await settle();
    expect(within(frame()).getByTestId(entry(FRAME.title).testId).textContent).toBe(entry(FRAME.title).label);
    info.resolve(SHELL_INFO);
    await screen.findByRole("heading", { level: 1 });
    expect(within(frame()).getByTestId(entry(FRAME.title).testId).textContent).toBe(entry(FRAME.title).label);
  });

  it("names the window with the product name the rest of the interface uses", () => {
    expect(entry(FRAME.title).label).toBe(homeCopy.productName);
  });

  it("falls back to a title and a drag region before the full catalogs load, and logs why, only when the frame's own registry cannot load", async () => {
    const info = deferred<AppInfo>();
    const home = healthyHome({
      getAppInfo: () => info.promise,
      loadFrameRegistry: () => {
        throw new Error("frame catalog broken");
      },
    });
    unbind = renderApp(home).unbind;
    await settle();
    expect(frame().textContent).toBe(homeCopy.productName);
    expect(within(frame()).queryAllByRole("button")).toEqual([]);
    expect(frame().getAttribute("data-tauri-drag-region")).toBe("deep");
    expect(home.records.filter((record) => record.code === "frame-catalog-invalid")).toEqual([
      expect.objectContaining({ severity: "error", message: frameCopy.controlsUnloaded, detail: "frame catalog broken" }),
    ]);
    info.resolve(SHELL_INFO);
    await screen.findByRole("heading", { level: 1 });
    expect(within(frame()).getAllByRole("button")).toHaveLength(3);
  });
});
