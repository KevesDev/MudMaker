import type { ControlId } from "../ui";
import type { WorkspaceDestination } from "./destinations";

/** The Settings entries after Appearance, per workspace, in the order the placement maps list them. Help sits here in every workspace. */
export const SETTINGS_ITEMS: Readonly<Record<WorkspaceDestination, readonly ControlId[]>> = {
  create: ["editor.preferences.02", "editor.preferences.03", "editor.preferences.04", "editor.preferences.05", "editor.preferences.06", "editor.preferences.07", "editor.preferences.09", "editor.shell.10"],
  play: ["client.preferences.02", "client.preferences.12", "client.preferences.13", "client.preferences.14", "client.preferences.15", "client.preferences.16", "client.game.08"],
  host: ["host.preferences.03", "host.preferences.05", "host.preferences.04"],
};

/** The on/off settings listed with them. */
export const SETTINGS_CHECKS: Readonly<Record<WorkspaceDestination, readonly ControlId[]>> = {
  create: ["editor.preferences.08"],
  play: ["client.preferences.07", "client.preferences.08", "client.preferences.09", "client.preferences.10"],
  host: ["host.preferences.02"],
};

/** The Play setting whose value the client display owns. */
export const TIMESTAMPS_SETTING = "client.preferences.07" as const satisfies ControlId;
