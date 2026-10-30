/** Limits of the editor shell that are not theme data. */
export const EDITOR_LIMITS = {
  /** How many draft commands can be undone. An editing session of a few hours makes well under this many deliberate edits, and each entry holds only its own undo data. */
  undoDepth: 200,
  /** How far, in pixels, a pointer must travel from where it went down before a press on a tab becomes a reorder, so a click with a slight slip still selects. */
  tabDragDistance: 6,
} as const;
