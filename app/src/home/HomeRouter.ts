import { FRAME_ACTION_OWNER, actionIdOf } from "../frame/frameActions";
import { SCOPE_IDS, type ScopeId, type ThemeManager } from "../theme";
import { openMenuHandler, type ActionBus, type ActionHandler, type ActionRegistry } from "../ui";
import { homeCopy } from "./homeCopy";
import { APPEARANCE, SPLASH } from "./homeLayout";

/** The owner the action table names for the actions the home screen handles itself. */
export const HOME_ROUTER = FRAME_ACTION_OWNER;

export interface HomeRouterDependencies {
  /** Starts the startup checks again; the owner of the startup state supplies it. */
  readonly retryStartup: () => void;
  readonly theme: Pick<ThemeManager, "listPresets" | "getSnapshot" | "selectPreset">;
}

/**
 * Handles the actions only the home screen owns. The workspace entries have no handler here: the
 * navigator that owns them does not exist yet, so the bus answers that they are unavailable.
 */
export function registerHomeRouter(bus: ActionBus, registry: ActionRegistry, dependencies: HomeRouterDependencies): () => void {
  const { theme, retryStartup } = dependencies;

  const retry: ActionHandler = () => {
    retryStartup();
    return Promise.resolve({ status: "success" });
  };

  /** Every scope follows the same preset; if one refuses, the scopes already changed go back so no window is left half switched. */
  const changeAppearance: ActionHandler = async ({ value }) => {
    const preset = typeof value === "string" ? theme.listPresets().find((candidate) => candidate.id === value) : undefined;
    if (preset === undefined) return { status: "validation-error", code: "appearance-unknown", message: homeCopy.appearanceUnknown };
    const previous = new Map<ScopeId, string>(SCOPE_IDS.map((scope) => [scope, theme.getSnapshot(scope).themeId]));
    const applied: ScopeId[] = [];
    for (const scope of SCOPE_IDS) {
      if (!theme.selectPreset(scope, preset.id).ok) {
        const stuck = applied.filter((changed) => !theme.selectPreset(changed, previous.get(changed) ?? "").ok);
        if (stuck.length > 0) {
          return { status: "recoverable-error", code: "appearance-partly-applied", message: homeCopy.appearancePartlyApplied(preset.label) };
        }
        return { status: "recoverable-error", code: "appearance-not-applied", message: homeCopy.appearanceNotApplied(preset.label) };
      }
      applied.push(scope);
    }
    return { status: "success", message: homeCopy.appearanceChanged(preset.label) };
  };

  const removers = [
    bus.registerHandler(HOME_ROUTER, actionIdOf(registry, APPEARANCE), changeAppearance),
    bus.registerHandler(HOME_ROUTER, actionIdOf(registry, SPLASH.settings), openMenuHandler),
    bus.registerHandler(HOME_ROUTER, actionIdOf(registry, SPLASH.retry), retry),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
