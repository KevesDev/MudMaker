/** The tail shared by the sentence form and the status form of the same fact. */
const NOT_AVAILABLE_YET = "not available in this build yet.";

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
  notInThisBuild: (label: string): string => `${label} is ${NOT_AVAILABLE_YET}`,
  /** For a status line that already names what it is about. */
  notInThisBuildState: `${NOT_AVAILABLE_YET.charAt(0).toUpperCase()}${NOT_AVAILABLE_YET.slice(1)}`,
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
