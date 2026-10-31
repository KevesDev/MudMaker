/** See home/homeTestSupport.tsx for what these tests cannot prove. */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { frameCopy } from "../frame/frameCopy";
import { GLYPHS } from "../frame/frameLayout";
import { APPEARANCE, SPLASH } from "../home/homeLayout";
import { healthyHome, renderApp, visibleText, type TestHome } from "../home/homeTestSupport";
import { SCOPE_IDS } from "../theme";
import { loadShippedRegistry, uiCopy } from "../ui";
import { MENU_CARET, NAVIGATION, WORKSPACE_DESTINATIONS, WORKSPACE_SCOPE, type WorkspaceDestination } from "./destinations";
import type { HostLeaveImpact, LeaveImpact, ServiceOutcome } from "./leaveImpact";

const registry = loadShippedRegistry();
const label = (id: string): string => registry.requireControl(id).label;
const identityOf = (workspace: WorkspaceDestination): string => label(NAVIGATION[workspace].entries[workspace]);
const goToLabel = (workspace: WorkspaceDestination): string => label(NAVIGATION[workspace].opener);
const settingsLabel = label(SPLASH.settings);

let unbind: (() => void) | null = null;

async function openSplash(home: TestHome = healthyHome()): Promise<TestHome> {
  unbind = renderApp(home).unbind;
  await screen.findByRole("heading", { level: 1 });
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

const region = (workspace: WorkspaceDestination): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`[data-workspace="${workspace}"]`);
  if (found === null) throw new Error(`The ${workspace} workspace was never opened.`);
  return found;
};
const visibleRegion = (workspace: WorkspaceDestination): HTMLElement => screen.getByRole("main", { name: identityOf(workspace) });
const goTo = async (workspace: WorkspaceDestination): Promise<HTMLElement> => {
  fireEvent.click(screen.getByRole("button", { name: goToLabel(workspace) }));
  return screen.findByRole("menu", { name: goToLabel(workspace) });
};
const menuNames = (menu: HTMLElement): string[] => within(menu).getAllByRole("menuitem").map((item) => item.textContent ?? "");
async function chooseGoTo(from: WorkspaceDestination, destination: string): Promise<void> {
  const menu = await goTo(from);
  fireEvent.click(within(menu).getByRole("menuitem", { name: destination }));
}

describe("touch and keyboard regions on the shared toolbar", () => {
  const tap = (element: Element): void => {
    fireEvent.pointerDown(element, { pointerId: 1, pointerType: "touch" });
    fireEvent.pointerUp(element, { pointerId: 1, pointerType: "touch" });
    fireEvent.click(element);
  };

  it.each([goToLabel("create"), settingsLabel])("opens %s with one tap and closes it with one tap outside, with no hover needed", async (name) => {
    await openSplash();
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH.create) }));
    await screen.findByRole("main", { name: identityOf("create") });
    tap(screen.getByRole("button", { name }));
    expect(await screen.findByRole("menu", { name })).toBeTruthy();
    expect(document.documentElement.dataset["inputModality"]).toBe("touch");
    fireEvent.pointerDown(visibleRegion("create"), { pointerId: 2, pointerType: "touch" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it.each(["play", "host"] as const)("cycles with F6 between the window bar and the %s surface and back", async (workspace) => {
    await openSplash();
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH[workspace]) }));
    const surface = await screen.findByRole("main", { name: identityOf(workspace) });
    await waitFor(() => expect(document.activeElement).toBe(surface));
    const bar = screen.getByRole("region", { name: frameCopy.regionName });
    const press = async (target: Element, shiftKey = false): Promise<void> => {
      fireEvent.keyDown(target, { key: "F6", shiftKey });
      await act(async () => undefined);
    };
    await press(surface);
    expect(bar.contains(document.activeElement)).toBe(true);
    await press(document.activeElement ?? bar);
    expect(document.activeElement).toBe(surface);
    await press(surface, true);
    expect(bar.contains(document.activeElement)).toBe(true);
  });
});

describe("opening the workspaces", () => {
  it.each(WORKSPACE_DESTINATIONS)("opens %s from the splash with only the shared toolbar around a plain empty surface, and moves focus into it", async (workspace) => {
    await openSplash();
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH[workspace]) }));
    await waitFor(() => expect(visibleRegion(workspace)).toBeTruthy());
    expect(document.activeElement).toBe(visibleRegion(workspace));
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(visibleRegion(workspace).textContent).toBe("");
    expect(visibleRegion(workspace).children).toHaveLength(0);
    expect(visibleText()).toEqual(["MudMaker", identityOf(workspace), settingsLabel, MENU_CARET, goToLabel(workspace), MENU_CARET, GLYPHS.minimize, GLYPHS.maximize, GLYPHS.close]);
    expect(document.querySelector(".ui-toast")).toBeNull();
  });

  it("gives the toolbar controls their catalog names and test ids, and no help text, since a labelled menu needs none", async () => {
    await openSplash();
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH.create) }));
    await screen.findByRole("main", { name: identityOf("create") });
    for (const id of [SPLASH.settings, NAVIGATION.create.opener]) {
      const opener = screen.getByTestId(registry.requireControl(id).testId);
      expect(opener.getAttribute("aria-haspopup")).toBe("menu");
      expect(opener.hasAttribute("aria-describedby")).toBe(false);
    }
    expect(screen.getByTestId(registry.requireControl(NAVIGATION.create.entries.create).testId).tagName).toBe("SPAN");
    expect(document.querySelectorAll(".app-frame-end .ui-tooltip")).toHaveLength(0);
  });

  it("puts Settings, then Go To, then the window controls in the tab order of every workspace", async () => {
    await openSplash();
    for (const workspace of WORKSPACE_DESTINATIONS) {
      if (workspace === "create") fireEvent.click(screen.getByRole("button", { name: label(SPLASH.create) }));
      else await chooseGoTo(workspace === "play" ? "create" : "play", identityOf(workspace));
      await screen.findByRole("main", { name: identityOf(workspace) });
      const names = [...document.querySelectorAll<HTMLElement>(".app-frame button")].map((button) => button.getAttribute("aria-label") ?? button.textContent?.replace(MENU_CARET, "") ?? "");
      expect(names.slice(0, 2), workspace).toEqual([settingsLabel, goToLabel(workspace)]);
      expect(names).toHaveLength(5);
    }
  });
});

describe("Go To", () => {
  it("lists exactly the other two workspaces, never the current one or the splash, and goes through all of them", async () => {
    await openSplash();
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH.create) }));
    await screen.findByRole("main", { name: identityOf("create") });
    const route: readonly [WorkspaceDestination, readonly WorkspaceDestination[], string][] = [
      ["create", ["play", "host"], identityOf("play")],
      ["play", ["create", "host"], identityOf("host")],
      ["host", ["create", "play"], identityOf("create")],
    ];
    for (const [from, others, next] of route) {
      const menu = await goTo(from);
      expect(menuNames(menu)).toEqual(others.map(identityOf));
      expect(within(menu).queryByRole("menuitem", { name: identityOf(from) })).toBeNull();
      fireEvent.click(within(menu).getByRole("menuitem", { name: next }));
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    }
    await screen.findByRole("main", { name: identityOf("create") });
  });

  it("closes on Escape without switching and gives focus back to Go To", async () => {
    await openSplash();
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH.play) }));
    await screen.findByRole("main", { name: identityOf("play") });
    await goTo("play");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: goToLabel("play") }));
    expect(visibleRegion("play")).toBeTruthy();
  });

  it("keeps every opened workspace and its local state through Go To", async () => {
    function Counter() {
      const [count, setCount] = useState(0);
      return (
        <button type="button" onClick={() => setCount(count + 1)}>
          {`Count ${count}`}
        </button>
      );
    }
    await openSplash(healthyHome({ surfaces: { create: Counter } }));
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH.create) }));
    fireEvent.click(await screen.findByRole("button", { name: "Count 0" }));
    fireEvent.click(screen.getByRole("button", { name: "Count 1" }));
    await chooseGoTo("create", identityOf("play"));
    await screen.findByRole("main", { name: identityOf("play") });
    expect(region("create").hidden).toBe(true);
    await chooseGoTo("play", identityOf("create"));
    expect(await screen.findByRole("button", { name: "Count 2" })).toBeTruthy();
  });
});

describe("Settings and Appearance", () => {
  it.each(WORKSPACE_DESTINATIONS)("offers Appearance in %s, changes only that scope through the theme manager, and marks it", async (workspace) => {
    const home = await openSplash();
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH[workspace]) }));
    await screen.findByRole("main", { name: identityOf(workspace) });
    const before = Object.fromEntries(SCOPE_IDS.map((scope) => [scope, home.manager.getSnapshot(scope).themeId]));
    const target = home.manager.listPresets().find((preset) => preset.id !== before[WORKSPACE_SCOPE[workspace]]);
    if (!target) throw new Error("The defaults must ship at least two presets.");
    fireEvent.click(screen.getByRole("button", { name: settingsLabel }));
    const group = within(await screen.findByRole("menu", { name: settingsLabel })).getByRole("group", { name: label(APPEARANCE) });
    fireEvent.click(within(group).getByRole("menuitemradio", { name: target.label }));
    await waitFor(() => expect(Object.fromEntries(SCOPE_IDS.map((scope) => [scope, home.manager.getSnapshot(scope).themeId]))).toEqual({ ...before, [WORKSPACE_SCOPE[workspace]]: target.id }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: settingsLabel }));
    fireEvent.click(screen.getByRole("button", { name: settingsLabel }));
    const marked = within(await screen.findByRole("group", { name: label(APPEARANCE) })).getAllByRole("menuitemradio");
    expect(marked.filter((item) => item.getAttribute("aria-checked") === "true").map((item) => item.getAttribute("data-value"))).toEqual([target.id]);
  });

  it("shows a refused appearance change as a message that can be dismissed, with focus back on Settings", async () => {
    const home = await openSplash();
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH.host) }));
    await screen.findByRole("main", { name: identityOf("host") });
    vi.spyOn(home.manager, "selectPreset").mockReturnValue({ ok: false, errors: [{ code: "out-of-range", token: "color.text.primary", message: "Refused for the test." }] });
    const other = home.manager.listPresets().find((preset) => preset.id !== home.manager.getSnapshot("home").themeId);
    fireEvent.click(screen.getByRole("button", { name: settingsLabel }));
    fireEvent.click(within(await screen.findByRole("group", { name: label(APPEARANCE) })).getByRole("menuitemradio", { name: other?.label ?? "" }));
    await waitFor(() => expect(document.querySelector(".ui-toast")?.textContent).toContain("Your current look is unchanged."));
    fireEvent.click(within(document.querySelector<HTMLElement>(".ui-toast") as HTMLElement).getByRole("button", { name: uiCopy.dismiss }));
    await waitFor(() => expect(document.querySelector(".ui-toast")).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: settingsLabel }));
  });
});

/** Fake services for the leave guard; the real ones arrive with their workspaces. */
function editorWithDraft(save: () => Promise<ServiceOutcome>) {
  let revision = 1;
  let dirty = ["Ashenvale"];
  return {
    describeLeaveImpact: vi.fn((): Promise<LeaveImpact | null> => Promise.resolve(dirty.length === 0 ? null : { revision, resources: dirty })),
    retainDraft: vi.fn((): Promise<ServiceOutcome> => Promise.resolve({ ok: true, revision })),
    save: vi.fn(async (): Promise<ServiceOutcome> => {
      const outcome = await save();
      if (outcome.ok) {
        revision = outcome.revision;
        dirty = [];
      }
      return outcome;
    }),
  };
}

describe("leaving a workspace that has something to protect", () => {
  async function openCreateWith(editor: ReturnType<typeof editorWithDraft>): Promise<void> {
    await openSplash(healthyHome({ leaveServices: { editor: { ...editor, describeLeaveImpact: (request) => (request.from === "create" ? editor.describeLeaveImpact() : Promise.resolve(null)) } } }));
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH.create) }));
    await screen.findByRole("main", { name: identityOf("create") });
  }
  const guardLabels = { keep: label("editor.navigationGuard.02"), save: label("editor.navigationGuard.03"), cancel: label("editor.navigationGuard.04") };

  it("asks once, names what is unsaved, offers exactly the catalog's choices and no second Close", async () => {
    await openCreateWith(editorWithDraft(() => Promise.resolve({ ok: true, revision: 2 })));
    await chooseGoTo("create", identityOf("play"));
    const dialog = await screen.findByRole("dialog", { name: label("editor.navigationGuard.01") });
    expect(within(dialog).getByText("Ashenvale")).toBeTruthy();
    expect(within(dialog).getAllByRole("button").map((button) => button.textContent)).toEqual([guardLabels.keep, guardLabels.save, guardLabels.cancel]);
    expect(visibleRegion("create")).toBeTruthy();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: guardLabels.keep }));
  });

  it("closes on Escape as Cancel: nothing is saved, the workspace stays and focus returns to Go To", async () => {
    const editor = editorWithDraft(() => Promise.resolve({ ok: true, revision: 2 }));
    await openCreateWith(editor);
    await chooseGoTo("create", identityOf("play"));
    await screen.findByRole("dialog");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(editor.save).not.toHaveBeenCalled();
    expect(visibleRegion("create")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: goToLabel("create") }));
  });

  it("shows a failed save beside its button, stays, and switches when the same choice succeeds on retry", async () => {
    let answers: ServiceOutcome[] = [{ ok: false, code: "project-save-failed", message: "The project could not be saved." }, { ok: true, revision: 2 }];
    const editor = editorWithDraft(() => Promise.resolve(answers.shift() ?? { ok: true, revision: 2 }));
    await openCreateWith(editor);
    await chooseGoTo("create", identityOf("play"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: guardLabels.save }));
    await waitFor(() => expect(within(dialog).getByText("The project could not be saved.")).toBeTruthy());
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(visibleRegion("create")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: guardLabels.save }));
    await screen.findByRole("main", { name: identityOf("play") });
    expect(screen.queryByRole("dialog")).toBeNull();
    answers = [];
  });

  it("keeps hosting and switches, or asks again before stopping a host with players", async () => {
    let players = 2;
    const host = {
      describeLeaveImpact: vi.fn((request: { from: string }): Promise<HostLeaveImpact | null> =>
        Promise.resolve(request.from === "host" ? { revision: 1, resources: ["Ashenvale"], connectedPlayers: players } : null),
      ),
      continueHosting: vi.fn((): Promise<ServiceOutcome> => Promise.resolve({ ok: true, revision: 1 })),
      requestStop: vi.fn((): Promise<ServiceOutcome> => Promise.resolve({ ok: true, revision: 2 })),
    };
    await openSplash(healthyHome({ leaveServices: { host } }));
    fireEvent.click(screen.getByRole("button", { name: label(SPLASH.host) }));
    await screen.findByRole("main", { name: identityOf("host") });
    await chooseGoTo("host", identityOf("play"));
    const dialog = await screen.findByRole("dialog", { name: label("host.navigationGuard.01") });
    fireEvent.click(within(dialog).getByRole("button", { name: label("host.navigationGuard.03") }));
    expect(await within(dialog).findByText(label("host.navigationGuard.05"))).toBeTruthy();
    expect(host.requestStop).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: label("host.navigationGuard.07") }));
    await within(dialog).findByRole("button", { name: label("host.navigationGuard.02") });
    fireEvent.click(within(dialog).getByRole("button", { name: label("host.navigationGuard.02") }));
    await screen.findByRole("main", { name: identityOf("play") });
    expect(host.continueHosting).toHaveBeenCalledWith(1);
    expect(host.requestStop).not.toHaveBeenCalled();
    players = 0;
  });

  it("tells the person when leaving could not be checked, with a reference, and stays", async () => {
    const editor = editorWithDraft(() => Promise.resolve({ ok: true, revision: 2 }));
    await openCreateWith(editor);
    editor.describeLeaveImpact.mockRejectedValueOnce(new Error("store unreadable"));
    await chooseGoTo("create", identityOf("play"));
    await waitFor(() => expect(document.querySelector(".ui-toast-code")?.textContent).toContain("leave-check-failed"));
    expect(visibleRegion("create")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
