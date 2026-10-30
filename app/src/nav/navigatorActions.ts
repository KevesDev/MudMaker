import { openMenuHandler, type ActionBus, type ActionHandler, type ActionId, type ActionOutcome } from "../ui";
import { WORKSPACE_DESTINATIONS, DESTINATION_ACTIONS, NAVIGATOR_OWNER } from "./destinations";
import { CHOICES, type Choice, type NavigationOutcome, type WorkspaceNavigator } from "./WorkspaceNavigator";

/** The action each choice of the leave guard answers. */
export const CHOICE_ACTIONS: Readonly<Record<Choice, ActionId>> = {
  "editor-keep": "ui.nav.editorKeepDraft",
  "editor-save": "ui.nav.editorSaveSwitch",
  "client-disconnect": "ui.nav.clientDisconnectSwitch",
  "host-keep": "ui.nav.hostKeepRunning",
  "host-stop": "ui.nav.hostStopSwitch",
  "host-confirm-stop": "ui.nav.hostConfirmStop",
  "host-keep-running": "ui.nav.hostCancelStop",
};

export const OPEN_MENU_ACTION: ActionId = "ui.nav.openMenu";
export const CANCEL_ACTION: ActionId = "ui.nav.cancel";

/** A switch that did not happen is a failure the person can try again; a completed step is silent because the screen itself changes. */
function outcomeOf(result: NavigationOutcome): ActionOutcome {
  return result.ok ? { status: "success", message: "" } : { status: "recoverable-error", code: result.code, message: result.message };
}

/** Registers every `ui.nav.*` action the navigator owns. Actions of screens that do not exist yet have no handler. */
export function registerNavigatorActions(bus: ActionBus, navigator: WorkspaceNavigator): () => void {
  const removers = [
    bus.registerHandler(NAVIGATOR_OWNER, OPEN_MENU_ACTION, openMenuHandler),
    bus.registerHandler(NAVIGATOR_OWNER, CANCEL_ACTION, () => Promise.resolve(outcomeOf(navigator.cancel()))),
    ...WORKSPACE_DESTINATIONS.map((destination) => {
      const go: ActionHandler = async ({ signal }) => outcomeOf(await navigator.request(destination, signal));
      return bus.registerHandler(NAVIGATOR_OWNER, DESTINATION_ACTIONS[destination], go);
    }),
    ...CHOICES.map((choice) => {
      const decide: ActionHandler = async ({ signal }) => outcomeOf(await navigator.choose(choice, signal));
      return bus.registerHandler(NAVIGATOR_OWNER, CHOICE_ACTIONS[choice], decide);
    }),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
