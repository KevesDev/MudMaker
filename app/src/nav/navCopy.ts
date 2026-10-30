/** Sentences the navigator reports; the labels of its controls come from the catalog. */
export const navCopy = {
  busy: "Another switch is still in progress.",
  notOffered: "That choice cannot be used right now.",
  cancelled: "The switch was cancelled.",
  timedOut: "The switch took too long and was stopped. Nothing was changed.",
  checkFailed: "MudMaker could not check what leaving would affect, so it stayed here.",
  stepFailed: "That step could not be completed, so it stayed here.",
  regionKeyUnavailable: (chord: string): string => `${chord} could not be set up for moving between parts of the screen.`,
  impactChanged: "Things changed while you were deciding. Please choose again.",
} as const;
