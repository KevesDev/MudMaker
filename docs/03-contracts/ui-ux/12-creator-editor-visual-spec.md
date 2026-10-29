# 12 — Creator Editor visual specification

**Purpose:** a focused standalone-feeling world-building mini-app within MudMaker; edits local drafts, not remote gameplay. [Shared shell](10-visual-language-and-shared-shell.md), [Creator function contract](04-editor-workspace.md), and [Editor controls](../../../contracts/ui/v1/editor-controls.v1.json) are binding.

## Default screen
- A **single compact top toolbar**: current project/name and accurate unsaved indicator; frequent **Save**, **Undo/Redo** and relevant **Validate/Test** actions where available; restrained contextual tools; **Settings ▾** and **Go To ▾** at the same predictable far end as Play and Host.
- **Settings ▾ → Appearance** (editor-scoped theme/typography) plus editor-specific preferences/layout/shortcuts. **Go To ▾ → Play, Host, Splash/Home** while in Create. Current workspace is identifiable, not an active menu item.
- **Central canvas/document dominates**: map, visual graph, script editor or other selected authoring surface. Retain existing dark continuous **graph-paper lines, never dots**, on graph/map canvas as the theme contract requires.
- **Asset Explorer** available in a compact collapsible rail/drawer, not a full-time huge navigation tree when unneeded. Project-level switching and asset search can live in a small header/command affordance.
- **Inspector is contextual:** opens for a selected room/entity/node/asset; tight field groups with readable labels. No enormous always-open blank panel; no nested tabs for every property category by default.
- **Problems/Build/Test Output** lives in a bottom collapsible area and opens when invoked or when important errors must be surfaced. Avoid five permanent tabs consuming the main work height.
- Multiple documents **may** use a compact document tab strip because switching among open map/graph/code documents is real work. Show only currently open documents; do not present every editor feature as a permanent tab.

## Interaction and priority
Immediate tool controls should be associated with the active map/graph/code surface rather than crammed into a global all-feature toolbar. Less frequent editing actions appear in semantic menus or contextual toolbars. Publish remains gated and explicitly validated; errors link into Problems. No fake save/publish success.

## Specific anti-clutter exclusions
No separate dashboard of tiles for Map, Graph, Quests, Blueprints, Code; no simultaneous Asset Explorer + unrelated inspectors + stacked modal-like panels as the default; no duplicate toolbar commands in a permanently expanded sidebar. All contract-defined tools remain reachable.

## Acceptance
Opening an existing project shows the working canvas first; selecting an element reveals only pertinent fields; user can find other authoring tools without a grid of unlabeled icons. Switching to another workspace keeps drafts as specified and never implicitly edits/runs the hosted world.
