import { SCOPE_IDS, type ScopeId, type ThemeManager } from "../theme";
import { UiContractError, type ActionBus, type ActionHandler, type ActionId, type ActionRegistry, type ControlId } from "../ui";
import { homeCopy } from "./homeCopy";
import { SPLASH } from "./homeLayout";

/** The owner the action table names for the actions the home screen handles itself. */
export const HOME_ROUTER = "HomeIntentRouter";

export interface HomeRouterDependencies {
  readonly quit: () => Promise<void>;
  /** Starts the startup checks again; the owner of the startup state supplies it. */
  readonly retryStartup: () => void;
  readonly theme: Pick<ThemeManager, "listPresets" | "getSnapshot" | "selectPreset">;
}

function actionOf(registry: ActionRegistry, controlId: ControlId): ActionId {
  const { actionId } = registry.requireControl(controlId);
  if (actionId === null) throw new UiContractError("control-passive", controlId, `Control "${controlId}" has no action for the home router to handle.`);
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
 * Handles the actions only the home screen owns. The workspace entries have no handler here: the
 * navigator that owns them does not exist yet, so the bus answers that they are unavailable.
 */
export function registerHomeRouter(bus: ActionBus, registry: ActionRegistry, dependencies: HomeRouterDependencies): () => void {
  const { quit, theme, retryStartup } = dependencies;

  const quitApplication: ActionHandler = async ({ signal }) => {
    await untilAborted(quit(), signal);
    return { status: "success", message: homeCopy.closing };
  };

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
    bus.registerHandler(HOME_ROUTER, actionOf(registry, SPLASH.quit), quitApplication),
    bus.registerHandler(HOME_ROUTER, actionOf(registry, SPLASH.appearance), changeAppearance),
    bus.registerHandler(HOME_ROUTER, actionOf(registry, SPLASH.retry), retry),
  ];
  bus.setDisabled(SPLASH.recentProjects, homeCopy.noRecentProjects);
  bus.setDisabled(SPLASH.recentWorlds, homeCopy.noRecentWorlds);
  return () => {
    for (const remove of removers) remove();
  };
}
