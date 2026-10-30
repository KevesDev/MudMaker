import type { ControlId } from "../ui";

/** The owner the action table names for every editor action. */
export const EDITOR_OWNER = "EditorIntentRouter";

/** Project actions drawn at the start of the Create toolbar, in order. */
export const PROJECT_ACTIONS = ["editor.shell.01", "editor.shell.03", "editor.shell.04", "editor.shell.05", "editor.shell.06"] as const satisfies readonly ControlId[];

/** Search, panels and help at the far end of the toolbar. */
export const VIEW_ACTIONS = { search: "editor.shell.08", panels: "editor.shell.09", help: "editor.shell.10" } as const satisfies Readonly<Record<string, ControlId>>;

/** Tools of the map canvas strip, in order. */
export const MAP_TOOLS = ["editor.map.02", "editor.map.03", "editor.map.04", "editor.map.05", "editor.map.06", "editor.map.07"] as const satisfies readonly ControlId[];

export const MAP_VIEW = { zoomIn: "editor.map.12", zoomOut: "editor.map.13", fit: "editor.map.14" } as const satisfies Readonly<Record<string, ControlId>>;

export const ASSETS = {
  explorer: "editor.assets.01",
  search: "editor.assets.02",
  filter: "editor.assets.03",
  create: "editor.assets.04",
  import: "editor.assets.05",
} as const satisfies Readonly<Record<string, ControlId>>;

/** The folders of the asset tree. A folder with nothing in it still shows, so the structure is visible before the first asset exists. */
export const ASSET_CATEGORIES: readonly { readonly id: string; readonly label: string }[] = [
  { id: "maps", label: "Maps" },
  { id: "blueprints", label: "Blueprints" },
  { id: "graphs", label: "Graphs" },
  { id: "scripts", label: "Scripts" },
  { id: "quests", label: "Quests" },
  { id: "dialogue", label: "Dialogue" },
];

export const INSPECTOR = { panel: "editor.inspector.01", name: "editor.inspector.02", description: "editor.inspector.03", addComponent: "editor.inspector.05" } as const satisfies Readonly<Record<string, ControlId>>;

/** The output views of the bottom drawer. The first is the one that stays on screen while the drawer is closed. */
export const OUTPUT_VIEWS = ["editor.diagnostics.01", "editor.diagnostics.02", "editor.diagnostics.03", "editor.diagnostics.04"] as const satisfies readonly ControlId[];
export const CLEAR_COMPLETED = "editor.diagnostics.07" as const satisfies ControlId;

/** What View Panels shows next, so one control reaches every arrangement of the side panels. */
export const PANEL_ARRANGEMENTS = [
  { assets: false, inspector: false },
  { assets: true, inspector: false },
  { assets: true, inspector: true },
] as const;
