/** Reads the shipped catalog files: it shows what the frame's registry is built from, not that anything renders. */
import { describe, expect, it } from "vitest";
import actionsJson from "../../../contracts/ui/v1/actions.v1.json";
import homeCatalog from "../../../contracts/ui/v1/home-controls.v1.json";
import { loadShippedRegistry } from "../ui";
import { FRAME, FRAME_SURFACE } from "./frameLayout";
import { loadFrameRegistry } from "./frameRegistry";

const registry = loadFrameRegistry();
const frameEntries = homeCatalog.controls.filter((control) => control.surface === FRAME_SURFACE);

describe("the frame's own registry", () => {
  it("holds exactly the controls of the frame surface, read from the home catalog file", () => {
    expect(frameEntries.length).toBeGreaterThan(0);
    for (const id of Object.values(FRAME)) expect(registry.control(id)?.surface, id).toBe(FRAME_SURFACE);
    const outside = homeCatalog.controls.filter((control) => control.surface !== FRAME_SURFACE);
    expect(outside.length).toBeGreaterThan(0);
    expect(outside.filter((control) => registry.control(control.id) !== undefined).map((control) => control.id)).toEqual([]);
  });

  it("holds exactly the actions its controls use, read from the action table file", () => {
    const used = [...new Set(frameEntries.flatMap((control) => (control.actionId === null ? [] : [control.actionId])))].sort();
    expect(used).toEqual(["ui.app.quit", "ui.window.minimize", "ui.window.toggleMaximize"]);
    for (const id of used) expect(registry.action(id)?.owner, id).toBe(actionsJson.actions.find((action) => action.id === id)?.owner);
    const others = actionsJson.actions.filter((action) => !used.includes(action.id));
    expect(others.filter((action) => registry.action(action.id) !== undefined)).toEqual([]);
  });

  it("describes each frame control exactly as the full catalogs do", () => {
    const full = loadShippedRegistry();
    for (const id of Object.values(FRAME)) expect(registry.requireControl(id), id).toEqual(full.requireControl(id));
  });

  it("is built once and shared", () => {
    expect(loadFrameRegistry()).toBe(registry);
  });
});
