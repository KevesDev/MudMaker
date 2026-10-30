import { UiContractError, type ControlDescriptor, type ControlId } from "../ui";

/** Catalog controls of the `home.splash` surface that the screen renders, named by the role they play. */
export const SPLASH = {
  name: "home.splash.01",
  version: "home.splash.02",
  startupStatus: "home.splash.03",
  create: "home.splash.04",
  play: "home.splash.05",
  host: "home.splash.06",
  quit: "home.splash.11",
  retry: "home.splash.13",
  settings: "home.splash.14",
} as const satisfies Readonly<Record<string, ControlId>>;

/** The appearance choice lives in the catalog's settings surface and is offered from the Settings menu. */
export const APPEARANCE = "home.settings.07" as const satisfies ControlId;

/** The accent colors an action can take; the stylesheet has one rule for each. */
export const ACTION_ACCENTS = ["primary", "secondary", "tertiary"] as const;
export type ActionAccent = (typeof ACTION_ACCENTS)[number];

/** The workspace entries in the order they sit in the row, each with the accent that draws it. Each is handled by the navigator, which a later phase adds. */
export const WORKSPACE_ACTIONS: readonly { readonly id: ControlId; readonly accent: ActionAccent }[] = [
  { id: SPLASH.create, accent: "primary" },
  { id: SPLASH.play, accent: "secondary" },
  { id: SPLASH.host, accent: "tertiary" },
];

export const WORKSPACE_ENTRIES: readonly ControlId[] = WORKSPACE_ACTIONS.map((action) => action.id);

/** Plain text characters drawn in the code font of the theme, like the window frame's; there is no icon set and no image. */
export const SPLASH_GLYPHS = {
  ornament: "✦",
  chevron: "›",
} as const;

export type StartupPhase = "ready" | "failed";

/** The `visibleWhen` conditions the home screen can decide today, and whether each holds in a phase. */
function implementedConditions(phase: StartupPhase): Readonly<Record<string, boolean>> {
  return {
    surfaceActive: phase === "ready",
    startupCheckFailed: phase === "failed",
  };
}

export const IMPLEMENTED_CONDITIONS: readonly string[] = Object.keys(implementedConditions("ready"));

/**
 * Conditions the catalog names whose data source does not exist yet: the saved projects list, the saved
 * worlds list and a running host. A control under one of these is never rendered; the name moves to the
 * implemented conditions when its data source ships.
 */
export const DEFERRED_CONDITIONS: readonly string[] = ["recentProjectsExist", "recentWorldsExist", "hostIsRunning"];

/** Whether the catalog says a control shows in this phase; a condition the home does not know is a defect, never a silent hide. */
export function isVisible(control: ControlDescriptor, phase: StartupPhase): boolean {
  const known = implementedConditions(phase);
  if (Object.hasOwn(known, control.visibleWhen)) return known[control.visibleWhen] === true;
  if (DEFERRED_CONDITIONS.includes(control.visibleWhen)) return false;
  throw new UiContractError("visible-when-unknown", control.id, `Control "${control.id}" is shown when "${control.visibleWhen}", which the home screen does not define.`);
}

/** The controls whose refusal or failure shows as a message on the screen, because nothing next to them can carry it. */
export const NOTICE_CONTROLS: readonly ControlId[] = [...WORKSPACE_ENTRIES, APPEARANCE];
