/** Every sentence the home screen shows or announces itself; labels and help of catalog controls come from the catalog. */
export const homeCopy = {
  loading: {
    label: "Getting MudMaker ready",
    help: "MudMaker is checking that everything it needs is working.",
  },
  failure: {
    title: "MudMaker could not start",
    summary: (labels: readonly string[]): string => `These checks did not pass: ${labels.join(", ")}. Choose Retry to check again.`,
    damaged: "This copy of MudMaker is damaged. Please reinstall MudMaker, then open it again.",
  },
  checks: {
    shell: { label: "Application", help: "Confirms the MudMaker program answered with its version details." },
    catalogs: { label: "Screen definitions", help: "Confirms every button and message on this screen is defined correctly." },
    theme: { label: "Appearance", help: "Confirms the chosen colors and fonts could be applied." },
    engine: { label: "Game engine", help: "Confirms whether the engine that runs games is installed." },
  },
  statusWord: {
    passed: "Passed.",
    attention: "Needs attention.",
    failed: "Failed.",
  },
  details: {
    shellPassed: "The program answered.",
    shellFailed: "MudMaker could not reach its own program.",
    catalogsPassed: "Every definition on this screen is valid.",
    catalogsFailed: "Some parts of this screen are missing or damaged.",
    themeActive: (presetLabel: string): string => `${presetLabel} is active.`,
    themeFailed: "MudMaker could not load its colors and fonts.",
    engineFailed: "MudMaker could not check whether the game engine is installed.",
  },
  sections: {
    start: "Start",
    recent: "Pick up where you left off",
    appearance: "Appearance",
  },
  versionLine: (label: string, version: string, buildId: string): string => `${label} ${version}, build ${buildId}`,
  noRecentProjects: "No recent projects yet",
  noRecentWorlds: "No recent worlds yet",
  appearanceNotSaved: "Your choice is not saved after you close MudMaker yet.",
  appearanceChanged: (presetLabel: string): string => `Appearance is now ${presetLabel}.`,
  appearanceUnknown: "That appearance is not available.",
  appearanceNotApplied: (presetLabel: string): string => `Appearance could not be changed to ${presetLabel}. Your current look is unchanged.`,
  appearancePartlyApplied: (presetLabel: string): string =>
    `Appearance could only be partly changed to ${presetLabel}. Choose a look again to bring every screen into step.`,
  closing: "Closing MudMaker.",
} as const;
