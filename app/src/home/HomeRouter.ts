import { FRAME_ACTION_OWNER, actionIdOf } from "../frame/frameActions";
import type { ActionBus, ActionHandler, ActionRegistry } from "../ui";
import { SPLASH } from "./homeLayout";

/** The owner the action table names for the actions the home screen handles itself. */
export const HOME_ROUTER = FRAME_ACTION_OWNER;

export interface HomeRouterDependencies {
  /** Starts the startup checks again; the owner of the startup state supplies it. */
  readonly retryStartup: () => void;
}

/** Handles the one action only the launch screen owns: starting the startup checks again. */
export function registerHomeRouter(bus: ActionBus, registry: ActionRegistry, dependencies: HomeRouterDependencies): () => void {
  const { retryStartup } = dependencies;

  const retry: ActionHandler = () => {
    retryStartup();
    return Promise.resolve({ status: "success" });
  };

  return bus.registerHandler(HOME_ROUTER, actionIdOf(registry, SPLASH.retry), retry);
}
