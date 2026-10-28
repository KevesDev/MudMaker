# Visual Cell-Grid Map and World Builder

**Status:** user requested map design CONFIRMED; workflow detail PROPOSED. **Owner:** map editor UI + world authoring commands. **Dependencies:** spatial contract, ECS schemas, input, persistence.

## Primary model
The world builder displays a configurable 2D cell grid (and optional multiple layers/maps), with each cell optionally linked to a playable Location entity/room. The creator arranges cells to make geography legible. Each cell supports color, icon, title, notes/tags, region visual grouping and deliberate relationship edges. **A grid cell is authoring metadata, not the Location entity and not automatically an exit.** The same location may have a stable ID while moving its cell.

## Cell interactions
1. Select cell by tap/click/keyboard; show contextual inspector on wide screen or responsive drawer on tablet.
2. If empty, offer Create Location and Link Existing Location, with safe undo.
3. Inspector shows room title, description, tags, region/biome assignment, visual color/icon, contents, exits, triggers/scripts, environmental overrides and validation warnings.
4. Contents group by Characters, NPCs, Items, Containers, Interactive, Triggers, Spawn Points, Scripts/Behaviors, Other; categories are derived from component/query capabilities, not rigid entity subclasses.
5. Searchable palette filters by name, tags, blueprint type, components and favorites; click/drag to add a blueprint instance; explicit inspect/edit/remove/duplicate/move actions.
6. Selecting entity opens its instance component editor and attached graph/script references; show origin Blueprint, version, local overrides and validated field controls.
7. Selecting exit opens exit inspector; show source, destination or dynamic resolver, direction/alias, display name, short and detailed exit description, lock rules, visibility, conditions, traversal action, trigger hooks, one-way/two-way behavior and enabled state.
8. Show visual arrows/edges for exits but keep tracks, transfer doors and topological room exits visually distinguishable.

## Exit editor detail
Creator can add/remove/edit exit from room. Search destination by name/id/map; pick static room or dynamic attachment (e.g. platform docking). Explicitly choose reverse exit creation; never infer from visual adjacency. Lock rules can be composed with graph editor: key possession, role/permission, world event/state, timed window, door open, train docked, arbitrary script condition. Show human-readable validation message and runtime preview for each state. Exit descriptions may interpolate approved world data through bounded safe templating.

## Regions and visual layers
- Region = semantic scope defined by entity membership/query, optionally author-marked via cell painting. Region assignments drive weather/spawn queries only when configured.
- Visual layers support floors, distant maps, train interiors and submaps. A moving train interior may appear as a separate static editor map with logical parent train: it does not change cell positions as train moves.
- Track editor layer supports directional links, stations, junctions, route preview and overlap validation separate from room exits.
- Icons and colors are authoring aid and customizable legend, with accessible labels; style metadata is not gameplay semantics by default.

## Canvas, tools and usability
Modes: Select, Place/Brush, Connect Exits, Paint Region/Color, Place Track, Erase with confirmation. Modes are explicit to prevent tap/drag confusion. Pan/zoom/minimap, snapping, marquee selection, multi-select, search, keyboard alternatives, touch-friendly controls, context menu and undo/redo. No feature requires right-click or hover on tablets. Large map rendering should virtualize visible cells/edges rather than mounting every item; performance budgets remain OPEN and require benchmarking.

## Data integrity and feedback
Changes are transactional and versioned. Invalid refs/cycles, deleting occupied or referenced location, destination outside world, lock expression compile error, graph/schema mismatch are diagnosed before publish. Autosave/dirty state must be truthful. Undo/redo restores both visual edit and paired topology change if grouped; editor draft and hosted instance use separate state/publish flow.

## First-class sample workflows
- Paint five cells different colors/icons; create rooms, set unique descriptions, connect one-way and reverse exits, set a lock.
- Select station cell; add train blueprint to platform and configure track edge graph without requiring scripting.
- Open train's interior map; add two car rooms, NPC, dropped item, internal exit, and dynamic station-door exit; preview while route moves.
- Add trigger to ticket machine, edit typed ticket data and graph; test success/failure.
- Define region for weather/spawner from selected cells, adjust conditions, preview timeline.

## Quest and phase-aware maps
Each cell/NPC/entity inspector links to the shared quest/condition asset, and can preview per-player presence and interaction. Hidden Joe is protected by server-authoritative filtering, not just a frontend icon toggle. See [Quest System](quests/INDEX.md).

## Acceptance
Recorded desktop+tablet user journeys demonstrate all above with project roundtrip, accessibility keyboard route, invalid exits and locks reporting, undo/redo correctness, multi-cell operations and non-destructive deletion preview. No fake click targets or in-memory-only save.
