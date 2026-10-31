import type { ControlId } from "../ui";

/** The owner the action table names for every editor action. */
export const EDITOR_OWNER = "EditorIntentRouter";

/** Project actions drawn at the start of the Create toolbar, in order. */
export const PROJECT_ACTIONS = ["editor.shell.01", "editor.shell.02", "editor.shell.03", "editor.shell.04"] as const satisfies readonly ControlId[];

/** The Build menu: its opener and the actions it lists. */
export const BUILD_MENU = { opener: "editor.shell.14", items: ["editor.shell.05", "editor.shell.06", "editor.shell.07"] } as const;

/** The View menu: its opener and the toggles it lists ahead of the output views. */
export const VIEW_MENU = { opener: "editor.shell.09", assets: "editor.shell.15", inspector: "editor.shell.16" } as const satisfies Readonly<Record<string, ControlId>>;

export const SEARCH = "editor.shell.08" as const satisfies ControlId;

/** Tools of the map canvas strip, in order. */
export const MAP_TOOLS = ["editor.map.02", "editor.map.03", "editor.map.04", "editor.map.05", "editor.map.06", "editor.map.07"] as const satisfies readonly ControlId[];

export const MAP_VIEW = { grid: "editor.map.10", snap: "editor.map.11", zoomIn: "editor.map.12", zoomOut: "editor.map.13", fit: "editor.map.14" } as const satisfies Readonly<Record<string, ControlId>>;

export const ASSETS = {
  explorer: "editor.assets.01",
  search: "editor.assets.02",
  filter: "editor.assets.03",
  create: "editor.assets.04",
  import: "editor.assets.05",
} as const satisfies Readonly<Record<string, ControlId>>;

/** The output views of the bottom drawer, which the View menu opens. */
export const OUTPUT_VIEWS = ["editor.diagnostics.01", "editor.diagnostics.02", "editor.diagnostics.03", "editor.diagnostics.04"] as const satisfies readonly ControlId[];
export const CLEAR_COMPLETED = "editor.diagnostics.07" as const satisfies ControlId;
