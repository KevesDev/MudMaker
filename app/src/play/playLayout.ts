import type { DropdownOption } from "../ui";
import type { ControlId } from "../ui";

/** The owner the action table names for every client action. */
export const CLIENT_OWNER = "ClientIntentRouter";

export const LIBRARY = {
  list: "client.worlds.01",
  add: "client.worlds.02",
  edit: "client.worlds.03",
  remove: "client.worlds.04",
  connect: "client.worlds.05",
  test: "client.worlds.06",
  search: "client.worlds.07",
  adapter: "client.worlds.08",
  host: "client.worlds.09",
  port: "client.worlds.10",
  tls: "client.worlds.11",
  badge: "client.worlds.12",
} as const satisfies Readonly<Record<string, ControlId>>;

export const GAME = {
  title: "client.game.01",
  status: "client.game.02",
  disconnect: "client.game.03",
  view: "client.game.09",
} as const satisfies Readonly<Record<string, ControlId>>;

export const TRANSCRIPT = { view: "client.transcript.01", find: "client.transcript.02" } as const satisfies Readonly<Record<string, ControlId>>;

/** The Settings entry that turns transcript timestamps on and off. */
export const TIMESTAMPS = "client.preferences.07" as const satisfies ControlId;

export const COMPOSER = { message: "client.composer.02", send: "client.composer.03" } as const satisfies Readonly<Record<string, ControlId>>;

/** The sections the View menu offers for the one secondary drawer, in order. */
export const PANEL_TABS = [
  "client.panels.01",
  "client.panels.02",
  "client.panels.03",
  "client.panels.04",
  "client.panels.05",
  "client.panels.06",
  "client.panels.07",
  "client.panels.08",
] as const satisfies readonly ControlId[];
export const PANEL_CLOSE = "client.panels.11" as const satisfies ControlId;
export const PANEL_UNAVAILABLE = "client.panels.12" as const satisfies ControlId;

/** The ways a world can be reached. */
export const ADAPTERS: readonly DropdownOption[] = [
  { value: "telnet", label: "Telnet" },
  { value: "mudmaker", label: "MudMaker" },
];
