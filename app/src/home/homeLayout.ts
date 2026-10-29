import type { ControlId } from "../ui";

/** Catalog controls of the `home.splash` surface, named by the role they play on the screen. */
export const SPLASH = {
  name: "home.splash.01",
  version: "home.splash.02",
  loadingStatus: "home.splash.03",
  create: "home.splash.04",
  play: "home.splash.05",
  host: "home.splash.06",
  recentProjects: "home.splash.07",
  recentWorlds: "home.splash.08",
  backgroundHosting: "home.splash.09",
  connectedWorlds: "home.splash.10",
  quit: "home.splash.11",
  appearance: "home.splash.12",
  retry: "home.splash.13",
} as const satisfies Readonly<Record<string, ControlId>>;

/** The workspace entries: each is handled by the navigator, which a later phase adds. */
export const WORKSPACE_ENTRIES: readonly ControlId[] = [SPLASH.create, SPLASH.play, SPLASH.host];
