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
  mapTools: "Map tools",
  mapToggleInvalid: "That setting could not be changed.",
  problemsDrawer: "Problems and output",
} as const;
