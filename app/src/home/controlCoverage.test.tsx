/** Renders every shipped screen through the real app and checks the controls on it against the catalogs. See home/homeTestSupport.tsx for what jsdom cannot prove. */
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import actionsJson from "../../../contracts/ui/v1/actions.v1.json";
import clientCatalog from "../../../contracts/ui/v1/client-controls.v1.json";
import editorCatalog from "../../../contracts/ui/v1/editor-controls.v1.json";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import hostCatalog from "../../../contracts/ui/v1/host-controls.v1.json";
import { fakeWindowShell } from "../frame/frameTestSupport";
import { NAVIGATION, WORKSPACE_DESTINATIONS } from "../nav/destinations";
import { loadShippedRegistry } from "../ui";
import { APPEARANCE, DEFERRED_CONDITIONS, SPLASH } from "./homeLayout";
import { healthyHome, renderApp, type TestHome } from "./homeTestSupport";

const registry = loadShippedRegistry();
const catalogControls = (surface: string): readonly { readonly id: string; readonly label: string; readonly visibleWhen: string }[] =>
  [homeCatalog, editorCatalog, clientCatalog, hostCatalog].flatMap((catalog) => catalog.controls).filter((control) => control.surface === surface);

/** Surfaces the application renders in full today. */
const IMPLEMENTED_SURFACES = ["home.splash", "home.frame", "editor.navigation", "client.navigation", "host.navigation"] as const;

/** Conditions whose data source does not exist yet, so their controls are never rendered: the hosting service, remote game sessions and the list of projects that can be hosted. */
const DEFERRED_WORKSPACE_CONDITIONS: readonly string[] = [...DEFERRED_CONDITIONS, "remoteSessionsExist", "projectsToHostExist"];

/** Conditions that hold only in a state the shipped screens reach by another path, with the state that renders them. */
const STATE_CONDITIONS: Readonly<Record<string, string>> = {
  startupCheckFailed: "the failure screen",
  windowMaximized: "a maximized window",
};

let unbind: (() => void) | null = null;
afterEach(() => {
  cleanup();
  unbind?.();
  unbind = null;
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-input-modality");
});

const rendered = new Map<string, HTMLElement>();
/** Controls seen by catalog test id, which also covers read-only text that carries no control id. */
const renderedIds = new Set<string>();
const testIds = new Map<string, string>(
  [homeCatalog, editorCatalog, clientCatalog, hostCatalog].flatMap((catalog) => catalog.controls).map((control) => [control.testId, control.id]),
);
const collect = (): void => {
  for (const element of document.querySelectorAll<HTMLElement>("[data-control-id]")) rendered.set(element.getAttribute("data-control-id") ?? "", element);
  for (const element of document.querySelectorAll<HTMLElement>("[data-testid]")) {
    const id = testIds.get(element.getAttribute("data-testid") ?? "");
    if (id !== undefined) renderedIds.add(id);
  }
};

async function start(home: TestHome): Promise<void> {
  unbind = renderApp(home).unbind;
  await act(async () => undefined);
}
const openAndCollectMenus = async (names: readonly string[]): Promise<void> => {
  for (const name of names) {
    fireEvent.click(screen.getByRole("button", { name }));
    await screen.findByRole("menu", { name });
    collect();
    fireEvent.keyDown(screen.getByRole("menu", { name }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  }
};

/** Walks the splash, the failure screen, a maximized window and the three workspaces, keeping every control seen. */
async function renderEveryShell(): Promise<void> {
  const settings = registry.requireControl(SPLASH.settings).label;
  await start(healthyHome());
  await screen.findByRole("heading", { level: 1 });
  collect();
  await openAndCollectMenus([settings]);
  for (const workspace of WORKSPACE_DESTINATIONS) {
    fireEvent.click(screen.getByRole("button", { name: registry.requireControl(SPLASH[workspace]).label }));
    await screen.findByRole("main", { name: registry.requireControl(NAVIGATION[workspace].entries[workspace]).label });
    collect();
    await openAndCollectMenus([settings, registry.requireControl(NAVIGATION[workspace].opener).label]);
    cleanup();
    unbind?.();
    await start(healthyHome());
    await screen.findByRole("heading", { level: 1 });
  }
  cleanup();
  unbind?.();
  await start(healthyHome({ windowShell: fakeWindowShell(true) }));
  await screen.findByRole("heading", { level: 1 });
  collect();
  cleanup();
  unbind?.();
  await start(healthyHome({ requireEngine: true }));
  await waitFor(() => screen.getByRole("button", { name: registry.requireControl(SPLASH.retry).label }));
  collect();
}

const accessibleName = (element: HTMLElement): string => {
  const labelled = element.getAttribute("aria-labelledby");
  const fromReference = labelled === null ? "" : labelled.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
  return (element.getAttribute("aria-label") ?? (fromReference.trim() || element.textContent) ?? "").trim();
};
const FOCUSABLE = "button, input, select, textarea, a[href], [tabindex]";

describe("every control the shipped screens render", () => {
  it("is in its catalog with its test id, a single registered action owner, a keyboard path and an accessible name", async () => {
    await renderEveryShell();
    expect(rendered.size).toBeGreaterThan(IMPLEMENTED_SURFACES.length);
    const problems: string[] = [];
    for (const [id, element] of rendered) {
      const control = registry.control(id);
      if (control === undefined) {
        problems.push(`${id} is not in a catalog`);
        continue;
      }
      /** The options of a choice group share the group's test id. */
      const carrier = element.closest("[data-testid]");
      if (control.testId === "" || carrier?.getAttribute("data-testid") !== control.testId) problems.push(`${id} does not carry its catalog test id`);
      if (control.actionId !== null) {
        const owners = actionsJson.actions.filter((action) => action.id === control.actionId).map((action) => action.owner);
        if (owners.length !== 1 || owners[0] === "") problems.push(`${id} action ${control.actionId} has ${owners.length} owners`);
        if (control.keyboard !== "focusAndActivate") problems.push(`${id} acts but declares keyboard ${control.keyboard}`);
        if (!element.matches(FOCUSABLE)) problems.push(`${id} cannot take keyboard focus`);
      }
      if (accessibleName(element) === "") problems.push(`${id} has no accessible name`);
    }
    expect(problems).toEqual([]);
  });

  it("covers the whole of each implemented surface: every control is rendered or waits on a named condition", async () => {
    await renderEveryShell();
    const waiting = new Set(DEFERRED_WORKSPACE_CONDITIONS);
    const gaps = IMPLEMENTED_SURFACES.flatMap(catalogControls)
      .filter((control) => !renderedIds.has(control.id) && !waiting.has(control.visibleWhen))
      .map((control) => `${control.id} (${control.label}, shown when ${control.visibleWhen})`);
    expect(gaps).toEqual([]);
    for (const condition of Object.keys(STATE_CONDITIONS)) {
      const owners = IMPLEMENTED_SURFACES.flatMap(catalogControls).filter((control) => control.visibleWhen === condition);
      expect(owners.length, STATE_CONDITIONS[condition]).toBeGreaterThan(0);
    }
    expect(renderedIds.has(APPEARANCE)).toBe(true);
  });
});
