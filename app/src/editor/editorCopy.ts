/** Words the editor shell parts show or announce themselves. Owners supply their own titles and labels. */
export const editorCopy = {
  resizeInspector: "Resize Inspector",
  unsavedChanges: "Unsaved changes",
  closeDocument: (title: string): string => `Close ${title}`,
  movedDocument: (title: string, position: number, total: number): string => `${title} moved to position ${position} of ${total}`,
  /** Drawn beside a document title that has unsaved changes. A shape, so the state never rests on color. */
  dirtyMark: "●",
  closeMark: "×",
  projectActions: "Project actions",
  viewActions: "View actions",
  assetFilterInvalid: "Choose one of the listed folders.",
  expandedMark: "▾",
  collapsedMark: "▸",
  mapTools: "Map tools",
  inspectorGeneral: "General",
  inspectorComponents: "Components",
  assetFilterAll: "All",
  problemsDrawer: "Problems and output",
  /** What each output view says while it holds nothing, keyed by the catalog control that shows the view. */
  emptyOutput: {
    "editor.diagnostics.01": "No problems.",
    "editor.diagnostics.02": "No test output.",
    "editor.diagnostics.03": "No trace.",
    "editor.diagnostics.04": "No build output.",
  },
} as const;
