/** Every sentence the shared library shows or announces on its own; owners supply their own outcome messages. */
export const copy = {
  working: "Working",
  done: "Done",
  close: "Close",
  dismiss: "Dismiss",
  chooseAnOption: "Choose one of the options to continue.",
  unavailablePrefix: "Unavailable:",
  shortcutPrefix: "Shortcut:",
  alreadyRunning: (label: string): string => `${label} is already running.`,
  disabledBecause: (label: string, reason: string): string => `${label} is not available. ${reason}`,
  notInThisBuild: (label: string): string => `${label} is not available yet.`,
  /** Shown before the option a choice list currently has. */
  chosenMark: "✓",
  takingLong: (label: string): string => `${label} is taking longer than expected.`,
  didNotFinish: (label: string): string => `${label} did not finish. Please try again.`,
  progressPercent: (percent: number): string => `${percent} percent`,
  toneLabel: {
    success: "Done",
    information: "Note",
    warning: "Warning",
    error: "Problem",
  },
  reference: (code: string): string => `Reference: ${code}`,
} as const;
