/** Ties the navigator's control and action names to the catalogs and the action table they come from. */
import { describe, expect, it } from "vitest";
import actionsJson from "../../../contracts/ui/v1/actions.v1.json";
import { SCOPE_IDS } from "../theme";
import { createUiRuntime, loadShippedRegistry } from "../ui";
import { DESTINATION_ACTIONS, NAVIGATION, NAVIGATOR_OWNER, WORKSPACE_DESTINATIONS, WORKSPACE_SCOPE, goToDestinations } from "./destinations";
import { CHOICE_ACTIONS, OPEN_MENU_ACTION, CANCEL_ACTION, registerNavigatorActions } from "./navigatorActions";
import { WorkspaceNavigator } from "./WorkspaceNavigator";

const registry = loadShippedRegistry();

/** What docs 10 and 15 list in each workspace: the other two workspaces, only. */
const GO_TO_LISTS = { create: ["play", "host"], play: ["create", "host"], host: ["create", "play"] } as const;

describe("workspace navigation controls", () => {
  it.each(WORKSPACE_DESTINATIONS)("%s has an opener and one entry per destination, bound to that destination's action", (workspace) => {
    const { opener, entries } = NAVIGATION[workspace];
    expect(registry.requireControl(opener).actionId).toBe(OPEN_MENU_ACTION);
    for (const destination of WORKSPACE_DESTINATIONS) {
      expect(registry.requireControl(entries[destination]).actionId, `${workspace} entry for ${destination}`).toBe(DESTINATION_ACTIONS[destination]);
    }
  });

  it.each(WORKSPACE_DESTINATIONS)("%s marks exactly its own entry as the current destination, which Go To leaves out", (workspace) => {
    const current = WORKSPACE_DESTINATIONS.filter((destination) => registry.requireControl(NAVIGATION[workspace].entries[destination]).enabledWhen === "currentDestinationDisabled");
    expect(current).toEqual([workspace]);
    expect(goToDestinations(workspace)).toEqual(GO_TO_LISTS[workspace]);
  });

  it("scopes every workspace's Appearance mark to a real theme scope", () => {
    for (const scope of Object.values(WORKSPACE_SCOPE)) expect(SCOPE_IDS).toContain(scope);
  });
});

describe("the navigator's actions", () => {
  const navigationActions = actionsJson.actions.filter((action) => action.id.startsWith("ui.nav.")).map((action) => action.id);

  it("are all owned by the owner the action table names", () => {
    expect(navigationActions.length).toBeGreaterThan(0);
    expect(actionsJson.actions.filter((action) => action.id.startsWith("ui.nav.")).map((action) => action.owner)).toEqual(navigationActions.map(() => NAVIGATOR_OWNER));
  });

  it("are handled exactly for the screens that exist: every destination, the menu opener, the leave guard and Cancel", async () => {
    const runtime = createUiRuntime({ registry, document, diagnostics: () => undefined });
    registerNavigatorActions(runtime.bus, new WorkspaceNavigator({}, () => undefined, () => ({})));
    const handled: string[] = [];
    for (const id of navigationActions) {
      const control = registry.controlsForAction(id)[0];
      const result = await runtime.bus.dispatch({ actionId: id, controlId: control?.id ?? null });
      if (result.status !== "unavailable") handled.push(id);
    }
    const expected = [...Object.values(DESTINATION_ACTIONS), ...Object.values(CHOICE_ACTIONS), OPEN_MENU_ACTION, CANCEL_ACTION];
    expect(handled.sort()).toEqual(expected.sort());
  });
});
