/** Thresholds of touch and pen recognition that are not theme data. */
export const GESTURE_LIMITS = {
  /** Screen pixels a finger may travel before a press stops being a tap or a possible long press and becomes a pan. */
  panSlop: 8,
  /** Milliseconds a finger must stay down, within the slop, to count as a long press. */
  longPressMs: 500,
  /** Milliseconds after the last pen activity during which new touch contacts are taken for a resting palm. */
  palmGraceMs: 800,
} as const;

export type GestureLimits = typeof GESTURE_LIMITS;

/** Browser chrome shortcuts the application takes over, by purpose. Chords use the spelling of chords.ts. */
export const BROWSER_SHORTCUTS = {
  reload: ["F5", "Ctrl+R", "Ctrl+Shift+R"],
  devtools: ["F12", "Ctrl+Shift+I", "Ctrl+Shift+J", "Ctrl+Shift+C"],
  viewSource: ["Ctrl+U"],
  print: ["Ctrl+P"],
  savePage: ["Ctrl+S"],
  find: ["Ctrl+F", "F3"],
  browserZoom: ["Ctrl++", "Ctrl+Shift++", "Ctrl+=", "Ctrl+-", "Ctrl+0"],
  historyNavigation: ["Alt+ArrowLeft", "Alt+ArrowRight"],
} as const;

export type BrowserShortcutGroup = keyof typeof BROWSER_SHORTCUTS;

/** Groups that keep working in a development build, where reloading and the developer tools are part of the work. */
export const DEVELOPMENT_SHORTCUT_GROUPS: readonly BrowserShortcutGroup[] = ["reload", "devtools"];

/** Keys that change the page when pressed outside text entry; inside text entry they edit text. */
export const BLOCKED_OUTSIDE_TEXT_ENTRY: readonly string[] = ["Backspace", "Ctrl+A"];

/** An element with this attribute, or inside one, lets the user select its text and press select all. */
export const SELECTABLE_ATTRIBUTE = "data-selectable";
