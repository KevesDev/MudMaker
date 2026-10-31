import { useEffect } from "react";
import { actionIdOf } from "../frame/frameActions";
import { openMenuHandler, useLatest, useUi, type ActionHandler, type ActionOutcome, type ControlId } from "../ui";

/** The answer of an action that only changes what the screen shows: nothing to announce and nothing to keep on the control. */
export const SILENT: ActionOutcome = { status: "success", message: "" };

/**
 * Registers, for the lifetime of a workspace, the handlers of the controls whose actions only change local
 * presentation. A control without a handler does nothing visible; the bus logs it.
 */
export function useIntentRouter(owner: string, handlers: Readonly<Record<ControlId, ActionHandler>>): void {
  const { bus, registry } = useUi();
  const latest = useLatest(handlers);
  const controls = Object.keys(handlers).sort().join(" ");
  useEffect(() => {
    const ids = controls.split(" ").filter((id) => id.length > 0);
    const removers = ids.map((controlId) =>
      bus.registerHandler(owner, actionIdOf(registry, controlId), (request) => {
        const handler = latest.current[controlId];
        return handler === undefined ? Promise.resolve(SILENT) : handler(request);
      }),
    );
    // A silent success has no words to show, so the control goes straight back to ready.
    const stopWatching = bus.subscribe(() => {
      for (const id of ids) {
        const runtime = bus.getRuntime(id);
        if (runtime.state === "success" && runtime.message === "") bus.reset(id);
      }
    });
    return () => {
      stopWatching();
      for (const remove of removers) remove();
    };
  }, [bus, registry, owner, controls, latest]);
}

/**
 * Registers the owner's answer for menu openers. Opening is a presentation change that the menu performs itself
 * on a silent success, so the answer must not be reset the way local presentation answers are.
 */
export function useMenuOpeners(owner: string, controlIds: readonly ControlId[]): void {
  const { bus, registry } = useUi();
  const controls = controlIds.join(" ");
  useEffect(() => {
    const removers = controls.split(" ").map((controlId) => bus.registerHandler(owner, actionIdOf(registry, controlId), openMenuHandler));
    return () => {
      for (const remove of removers) remove();
    };
  }, [bus, registry, owner, controls]);
}
