import type { ActionId, ControlId } from "../ui";

export const DESTINATIONS = ["splash", "create", "play", "host"] as const;
export type Destination = (typeof DESTINATIONS)[number];

export const WORKSPACE_DESTINATIONS = ["create", "play", "host"] as const;
export type WorkspaceDestination = (typeof WORKSPACE_DESTINATIONS)[number];

export function isWorkspace(destination: Destination): destination is WorkspaceDestination {
  return destination !== "splash";
}

/** The owner the action table names for every `ui.nav.*` action. */
export const NAVIGATOR_OWNER = "WorkspaceNavigator";

/** The action that asks to go to each workspace. The splash is only where the app starts. */
export const DESTINATION_ACTIONS: Readonly<Record<WorkspaceDestination, ActionId>> = {
  create: "ui.nav.create",
  play: "ui.nav.play",
  host: "ui.nav.host",
};

/** The Go To opener and the entry for each destination in a workspace's own navigation surface. The entry for the workspace itself names it. */
export interface NavigationControls {
  readonly opener: ControlId;
  readonly entries: Readonly<Record<WorkspaceDestination, ControlId>>;
}

export const NAVIGATION: Readonly<Record<WorkspaceDestination, NavigationControls>> = {
  create: {
    opener: "editor.navigation.01",
    entries: { create: "editor.navigation.02", play: "editor.navigation.03", host: "editor.navigation.04" },
  },
  play: {
    opener: "client.navigation.01",
    entries: { create: "client.navigation.02", play: "client.navigation.03", host: "client.navigation.04" },
  },
  host: {
    opener: "host.navigation.01",
    entries: { create: "host.navigation.02", play: "host.navigation.03", host: "host.navigation.04" },
  },
};

/** The theme scope a workspace's Appearance choice marks as current. */
export const WORKSPACE_SCOPE = { create: "editor", play: "client", host: "host" } as const satisfies Readonly<Record<WorkspaceDestination, string>>;

/** The decorative caret that tells a menu opener from a plain button. */
export const MENU_CARET = "▾";

/** The Go To destinations of a workspace in catalog order: the other two workspaces. */
export function goToDestinations(workspace: WorkspaceDestination): readonly WorkspaceDestination[] {
  return WORKSPACE_DESTINATIONS.filter((destination) => destination !== workspace);
}
