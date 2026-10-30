import { actionIdOf } from "../frame/frameActions";
import type { ActionBus, ActionHandler, ActionRegistry } from "../ui";
import type { CanvasState } from "./CanvasState";
import { canvasCopy } from "./canvasCopy";

/** The owner the action table names for the editor's actions. */
export const EDITOR_ROUTER_OWNER = "EditorIntentRouter";

export const CANVAS_CONTROLS = {
  paper: "editor.graph.01",
  snap: "editor.graph.09",
  grid: "editor.graph.10",
} as const;

function toggle(apply: (on: boolean) => void): ActionHandler {
  return ({ value }) => {
    if (typeof value !== "boolean") return Promise.resolve({ status: "validation-error", code: "canvas-toggle-invalid", message: canvasCopy.toggleInvalid });
    apply(value);
    return Promise.resolve({ status: "success" });
  };
}

/** Registers the grid and snap toggles; the returned function removes them. */
export function registerCanvasActions(bus: ActionBus, registry: ActionRegistry, state: CanvasState): () => void {
  const removers = [
    bus.registerHandler(EDITOR_ROUTER_OWNER, actionIdOf(registry, CANVAS_CONTROLS.grid), toggle((on) => state.setGridVisible(on))),
    bus.registerHandler(EDITOR_ROUTER_OWNER, actionIdOf(registry, CANVAS_CONTROLS.snap), toggle((on) => state.setSnapEnabled(on))),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
