import { FRAME_ACTION_OWNER } from "../frame/frameActions";
import { APP_SCOPE, type ActionHandler, type ActionId, type DiagnosticSink, type UiRuntime } from "../ui";
import { navCopy } from "./navCopy";

export const REGION_NEXT_ACTION: ActionId = "ui.shell.regionNext";
export const REGION_PREVIOUS_ACTION: ActionId = "ui.shell.regionPrevious";

const REGION_KEYS = [
  { chord: "F6", action: REGION_NEXT_ACTION, step: 1 },
  { chord: "Shift+F6", action: REGION_PREVIOUS_ACTION, step: -1 },
] as const;

function cycle(runtime: UiRuntime, step: 1 | -1): ActionHandler {
  return () => {
    runtime.regions.cycle(step);
    return Promise.resolve({ status: "success", message: "" });
  };
}

/**
 * Binds F6 and Shift+F6 to moving focus between the regions of the screen, in the application scope so
 * they work in every workspace. A chord that another owner already holds is reported, never taken over.
 */
export function registerRegionCycling(runtime: UiRuntime, report: DiagnosticSink): () => void {
  const removers: (() => void)[] = [];
  for (const { chord, action, step } of REGION_KEYS) {
    removers.push(runtime.bus.registerHandler(FRAME_ACTION_OWNER, action, cycle(runtime, step)));
    const bound = runtime.shortcuts.register({ scope: APP_SCOPE, chord, actionId: action, owner: FRAME_ACTION_OWNER });
    if (bound.ok) {
      removers.push(bound.unregister);
    } else {
      report({ severity: "error", code: bound.error.code, actionId: action, controlId: null, message: navCopy.regionKeyUnavailable(chord), detail: bound.error.message, correlation: {} });
    }
  }
  return () => {
    for (const remove of removers) remove();
  };
}
