import { FRAME_ACTION_OWNER, actionIdOf } from "../frame/frameActions";
import { homeCopy } from "../home/homeCopy";
import { APPEARANCE, APPEARANCE_MENU, SPLASH } from "../home/homeLayout";
import { type ThemeManager } from "../theme";
import { CUSTOMIZE_CONTROL } from "../theme/themeEditorControls";
import { openMenuHandler, type ActionBus, type ActionHandler, type ActionRegistry } from "../ui";
import { registerNavigatorActions } from "./navigatorActions";
import type { WorkspaceNavigator } from "./WorkspaceNavigator";

/** The owner the action table names for the Settings menu and Appearance. */
export const SHELL_ROUTER_OWNER = FRAME_ACTION_OWNER;

export interface ShellRouterDependencies {
  readonly theme: Pick<ThemeManager, "listPresets" | "selectApplicationPreset">;
  readonly navigator: WorkspaceNavigator;
  readonly openThemeEditor?: () => void;
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
    if (!theme.selectApplicationPreset(preset.id).ok) {
      return { status: "recoverable-error", code: "appearance-not-applied", message: homeCopy.appearanceNotApplied(preset.label) };
    }
    return { status: "success", message: "" };
  };

  const removers = [
    bus.registerHandler(SHELL_ROUTER_OWNER, actionIdOf(registry, APPEARANCE), changeAppearance),
    bus.registerHandler(SHELL_ROUTER_OWNER, actionIdOf(registry, APPEARANCE_MENU), openMenuHandler),
    bus.registerHandler(SHELL_ROUTER_OWNER, actionIdOf(registry, SPLASH.settings), openMenuHandler),
    registerNavigatorActions(bus, navigator),
  ];
  if (dependencies.openThemeEditor !== undefined) {
    for (const id of new Set(Object.values(CUSTOMIZE_CONTROL))) {
      removers.push(bus.registerHandler(SHELL_ROUTER_OWNER, actionIdOf(registry, id), async () => {
        dependencies.openThemeEditor?.();
        return { status: "success", message: "" };
      }));
    }
  }
  return () => {
    for (const remove of removers) remove();
  };
}
