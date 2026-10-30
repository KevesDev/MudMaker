import type { ControlId } from "../ui";

/** The owner the action table names for every host action. */
export const HOST_OWNER = "HostAdminIntentRouter";

export const DASHBOARD = { status: "host.dashboard.02", start: "host.dashboard.03" } as const satisfies Readonly<Record<string, ControlId>>;

/** The one section selector, in order. Each names a catalog tab; the sections they open are listed in SECTION_CONTENT. */
export const SECTIONS = ["host.dashboard.08", "host.dashboard.09", "host.dashboard.10", "host.dashboard.11", "host.dashboard.12"] as const satisfies readonly ControlId[];
export type Section = (typeof SECTIONS)[number];

export const RELEASES = "host.recovery.01" as const satisfies ControlId;

export const NETWORK = {
  bind: "host.network.01",
  port: "host.network.02",
  requireTls: "host.network.04",
  proxy: "host.network.05",
  proxyList: "host.network.06",
  verify: "host.network.07",
  apply: "host.network.08",
  warning: "host.network.09",
} as const satisfies Readonly<Record<string, ControlId>>;

/** Bind addresses that accept connections from other machines. */
export const PUBLIC_BINDS: readonly string[] = ["0.0.0.0", "::"];

export const PLAYERS = {
  list: "host.security.01",
  limits: "host.security.06",
  incident: "host.security.07",
  maintenance: "host.security.08",
} as const satisfies Readonly<Record<string, ControlId>>;

export const RECOVERY = {
  validate: "host.recovery.02",
  activate: "host.recovery.03",
  backup: "host.recovery.04",
  restore: "host.recovery.05",
  rollback: "host.recovery.06",
} as const satisfies Readonly<Record<string, ControlId>>;
