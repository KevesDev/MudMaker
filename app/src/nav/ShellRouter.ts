import { FRAME_ACTION_OWNER, actionIdOf } from "../frame/frameActions";
import { homeCopy } from "../home/homeCopy";
import { APPEARANCE, SPLASH } from "../home/homeLayout";
import { type ThemeManager } from "../theme";
import { openMenuHandler, type ActionBus, type ActionHandler, type ActionRegistry } from "../ui";
import { WORKSPACE_SCOPE } from "./destinations";
import { registerNavigatorActions } from "./navigatorActions";
import type { WorkspaceNavigator } from "./WorkspaceNavigator";

/** The owner the action table names for the Settings menu and Appearance. */
export const SHELL_ROUTER_OWNER = FRAME_ACTION_OWNER;

export interface ShellRouterDependencies {
  readonly theme: Pick<ThemeManager, "listPresets" | "getSnapshot" | "selectPreset">;
  readonly navigator: WorkspaceNavigator;
}

/**
 * Handles what every screen of the window shares: workspace navigation, the Settings menu and Appearance.
 * The window controls are registered by the frame, which every screen sits in.
 */
export function registerShellRouter(bus: ActionBus, registry: ActionRegistry, dependencies: ShellRouterDependencies): () => void {
  const { theme, navigator } = dependencies;

  /** Appearance belongs only to the scope of the destination showing the Settings menu. */
  const changeAppearance: ActionHandler = async ({ value }) => {
    const preset = typeof value === "string" ? theme.listPresets().find((candidate) => candidate.id === value) : undefined;
    if (preset === undefined) return { status: "validation-error", code: "appearance-unknown", message: homeCopy.appearanceUnknown };
    const destination = navigator.getSnapshot().destination;
    const scope = destination === "splash" ? "home" : WORKSPACE_SCOPE[destination];
    if (!theme.selectPreset(scope, preset.id).ok) {
      return { status: "recoverable-error", code: "appearance-not-applied", message: homeCopy.appearanceNotApplied(preset.label) };
    }
    return { status: "success", message: "" };
  };

  const removers = [
    bus.registerHandler(SHELL_ROUTER_OWNER, actionIdOf(registry, APPEARANCE), changeAppearance),
    bus.registerHandler(SHELL_ROUTER_OWNER, actionIdOf(registry, SPLASH.settings), openMenuHandler),
    registerNavigatorActions(bus, navigator),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
