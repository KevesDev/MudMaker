import type { ControlState } from "./ActionBus";
import type { ControlDescriptor } from "./types";

/** States the interaction contract names, plus the catalog words `error` and `visible`. */
export const CATALOG_STATE_WORDS: ReadonlySet<string> = new Set([
  "hidden",
  "visible",
  "visible-disabled",
  "ready",
  "disabled",
  "focused",
  "pending",
  "success",
  "validation-error",
  "denied",
  "unavailable",
  "recoverable-error",
  "error",
  "empty",
  "loading",
  "populated",
  "disconnected",
  "stale",
]);

/** In the catalogs `error` stands for the contract's recoverable-error; every other word names itself. */
function runtimeStateOf(word: string): string {
  return word === "error" ? "recoverable-error" : word;
}

const OTHER_FAILURES: ReadonlySet<ControlState> = new Set<ControlState>(["validation-error", "denied", "unavailable"]);

/**
 * The state a control may show. A control never shows a state outside its listed variants: a
 * failure it cannot name is shown as its error variant, and anything else it does not list
 * returns it to ready, leaving the confirmed outcome to the announcement.
 */
export function shownState(control: ControlDescriptor, state: ControlState): ControlState {
  const listed = new Set(control.stateVariants.map(runtimeStateOf));
  if (listed.has(state)) return state;
  if (OTHER_FAILURES.has(state) && listed.has("recoverable-error")) return "recoverable-error";
  return "ready";
}
