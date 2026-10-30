/** Reads the shipped catalogs and the layout names only: it shows the data agrees, not that anything renders. */
import { describe, expect, it } from "vitest";
import actionsJson from "../../../contracts/ui/v1/actions.v1.json";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import { loadShippedRegistry } from "../ui";
import { FRAME, FRAME_SURFACE, MODE_CONDITION, TOGGLE_CONTROLS } from "./frameLayout";

const registry = loadShippedRegistry();
const frameEntries = homeCatalog.controls.filter((control) => control.surface === FRAME_SURFACE);
const entry = (id: string) => {
  const found = frameEntries.find((control) => control.id === id);
  if (!found) throw new Error(`No frame control ${id}`);
  return found;
};
const buttons = [FRAME.minimize, FRAME.maximize, FRAME.restore, FRAME.close];

describe("the home.frame surface of the catalog", () => {
  it("holds exactly the controls the layout names, with sequential ids and test ids derived from them", () => {
    expect(frameEntries.map((control) => control.id).sort()).toEqual(Object.values(FRAME).sort());
    for (const control of frameEntries) {
      expect(control.workspace).toBe("home");
      expect(control.testId, control.id).toBe(`UI-${control.id.replaceAll(".", "-")}`);
    }
  });

  it("makes the title passive text and every other control a button with an action", () => {
    expect(entry(FRAME.title)).toMatchObject({ kind: "text", actionId: null, keyboard: "semanticRead" });
    for (const id of buttons) {
      expect(entry(id), id).toMatchObject({ kind: "button", keyboard: "focusAndActivate", permission: "localUser", enabledWhen: "authorizedAndReady" });
      expect(entry(id).actionId, id).toMatch(/^ui\.(window|app)\./);
    }
  });

  it("gives every button a tooltip sentence of its own and an error state it can show, so a failed window command is never silent", () => {
    for (const id of buttons) {
      const control = entry(id);
      expect(control.tooltip.length, id).toBeGreaterThanOrEqual(10);
      expect(control.tooltip, id).not.toBe(control.label);
      expect(control.stateVariants, id).toEqual(expect.arrayContaining(["ready", "disabled", "error"]));
    }
  });

  it("shows Maximize only while the window is restored and Restore only while it is maximized, both for one toggle action", () => {
    expect(TOGGLE_CONTROLS).toEqual([FRAME.maximize, FRAME.restore]);
    expect(entry(FRAME.maximize).visibleWhen).toBe(MODE_CONDITION.restored);
    expect(entry(FRAME.restore).visibleWhen).toBe(MODE_CONDITION.maximized);
    expect(MODE_CONDITION.restored).not.toBe(MODE_CONDITION.maximized);
    expect(entry(FRAME.maximize).actionId).toBe(entry(FRAME.restore).actionId);
    expect(entry(FRAME.minimize).actionId).not.toBe(entry(FRAME.maximize).actionId);
  });

  it("makes Close the Quit action, so there is one quit path", () => {
    expect(entry(FRAME.close).actionId).toBe("ui.app.quit");
    expect(registry.requireControl("home.splash.11").actionId).toBe("ui.app.quit");
  });

  it("owns each window action in the table with the router that owns Quit, and defines no other window action", () => {
    const owner = actionsJson.actions.find((action) => action.id === "ui.app.quit")?.owner;
    expect(owner).toBeDefined();
    const windowActions = actionsJson.actions.filter((action) => action.id.startsWith("ui.window."));
    expect(windowActions.map((action) => action.id).sort()).toEqual(["ui.window.minimize", "ui.window.toggleMaximize"]);
    for (const action of windowActions) expect(action.owner, action.id).toBe(owner);
    expect(frameEntries.map((control) => control.actionId).filter((id) => id?.startsWith("ui.window."))).toHaveLength(3);
  });
});
