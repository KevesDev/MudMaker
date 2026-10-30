/** Every sentence the home screen shows or announces itself; labels and help of catalog controls come from the catalog. */
export const homeCopy = {
  /** The name of the progress bar while the program starts; nothing about it is drawn. */
  loadingLabel: "Getting MudMaker ready",
  productName: "MudMaker",
  failure: {
    summary: (names: readonly string[]): string => `MudMaker could not start: ${names.join(", ")}.`,
    damaged: "This copy of MudMaker is damaged. Please reinstall MudMaker, then open it again.",
  },
  /** What a person calls each part when it fails. */
  checkNames: {
    shell: "Application",
    catalogs: "Screen definitions",
    theme: "Appearance",
    engine: "Game engine",
  },
  /** The accessible name of the group of workspace entries; it is not drawn. */
  startNavigation: "Start",
  /** The first line beside the banner: the catalog's own word for it, then the installed version. */
  versionLine: (label: string, version: string): string => `${label} ${version}`,
  /** The second line beside the banner. */
  buildLine: (buildId: string): string => `Build ${buildId}`,
  /** The one line under the banner, where there is no room beside it. */
  versionCompact: (label: string, version: string, buildId: string): string => `${label} ${version}, build ${buildId}`,
  /** The one brand line under the wordmark. Deleting this string and its element removes it. */
  tagline: "BUILD WORLDS. YOUR WAY.",
  appearanceChanged: (presetLabel: string): string => `Appearance is now ${presetLabel}.`,
  appearanceUnknown: "That appearance could not be found.",
  appearanceNotApplied: (presetLabel: string): string => `Appearance could not be changed to ${presetLabel}. Your current look is unchanged.`,
  appearancePartlyApplied: (presetLabel: string): string =>
    `Appearance could only be partly changed to ${presetLabel}. Choose a look again to bring every screen into step.`,
} as const;
