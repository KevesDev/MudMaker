import {
  UiContractError,
  type ActionBus,
  type ActionHandler,
  type ActionId,
  type ActionRegistry,
  type ControlId,
} from "../ui";
import { frameCopy } from "./frameCopy";
import { FRAME } from "./frameLayout";
import type { WindowController } from "./WindowController";

/** The owner the action table names for the window and quit actions. */
export const FRAME_ACTION_OWNER = "HomeIntentRouter";

export interface FrameActionDependencies {
  readonly quit: () => Promise<void>;
  readonly window: Pick<WindowController, "minimize" | "toggleMaximize">;
}

/** The action a control stands for; a control with none cannot be handled. */
export function actionIdOf(registry: ActionRegistry, controlId: ControlId): ActionId {
  const { actionId } = registry.requireControl(controlId);
  if (actionId === null) throw new UiContractError("control-passive", controlId, `Control "${controlId}" has no action for its router to handle.`);
  return actionId;
}

/** Settles as soon as the signal fires, so the bus is never left waiting on work it has stopped waiting for. */
function untilAborted<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(signal.reason);
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/**
 * Handles the actions of the frame row: Minimize, Maximize or Restore, and Close, which is the one quit
 * action of the application. Every screen's runtime registers these and nothing else registers them.
 */
export function registerFrameActions(bus: ActionBus, registry: ActionRegistry, dependencies: FrameActionDependencies): () => void {
  const { quit, window: frameWindow } = dependencies;

  const quitApplication: ActionHandler = async ({ signal }) => {
    await untilAborted(quit(), signal);
    return { status: "success", message: frameCopy.closing };
  };

  /** A window change needs no announcement beyond the control's own name, so it answers with no words. */
  const minimizeWindow: ActionHandler = async ({ signal }) => {
    await untilAborted(frameWindow.minimize(), signal);
    return { status: "success", message: "" };
  };

  /** The mode is announced only when it was read back from the window after the change. */
  const toggleMaximize: ActionHandler = async ({ signal }) => {
    const mode = await untilAborted(frameWindow.toggleMaximize(), signal);
    if (mode === null) return { status: "success", message: "" };
    return { status: "success", message: mode === "maximized" ? frameCopy.windowMaximized : frameCopy.windowRestored };
  };

  const removers = [
    bus.registerHandler(FRAME_ACTION_OWNER, actionIdOf(registry, FRAME.close), quitApplication),
    bus.registerHandler(FRAME_ACTION_OWNER, actionIdOf(registry, FRAME.minimize), minimizeWindow),
    bus.registerHandler(FRAME_ACTION_OWNER, actionIdOf(registry, FRAME.maximize), toggleMaximize),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
