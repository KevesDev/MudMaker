# 02 | MudMaker Visual Graph Editor — Dark Graph Paper

**Status:** visual direction DECIDED; UI/runtime implementation pending. **Canvas style authority:** [central ThemeManager](../../03-contracts/editor-theme-manager.md). **Graph behavior authority:** [typed graph v1](../../03-contracts/scripting-v1/06-graph-parity-and-publishing.md). Do not invent independent color/font themes here.

## Canvas appearance (fixed visual direction)
The canvas is **quiet, dark graph paper**: continuous orthogonal minor horizontal/vertical lines form squares, subtly stronger major lines at regular intervals, using **ThemeManager grid tokens**. **No dotted grid**. No textures/gradients/noise. Pan/zoom and line visibility use theme values, stable world coordinates and bounded viewport rendering. The same shared canvas is used for visual scripting, Blueprint graphs, quest chains and dialogues, world-system flows and any other node editor.

Node card surfaces, text hierarchy, semantic categories, ports, edge strokes, focus states, shadows, spacing, rounding, animation and touch target sizes are **all resolved through ThemeManager tokens**; none are local hardcoded styles. User-selected themes change every editor. Distinguish node types using readable titles, port shapes/icons and labels, not color alone.

## Desktop layout
Header: Project → Blueprint/Quest/System → Graph, asset dirty/validated/published state and visible Save, Validate, Test, Arrange, Search. Left: searchable node palette (Events, Flow, Conditions, Entities/Components, Queries, Movement, Items, Quest/Dialogue, Rewards, World Events, Narration, Custom C#). Center: world-space pan/zoom graph paper, typed ports, fit-to-content, alignment/distribution, editable group frames, readable connections and reversible auto-layout. Right: selected node, typed properties, port connections, Help, Validation and owning asset. Bottom: Problems, live server trace, actual effect plan and observer outputs (never fabricated traces). Tabs and panels reuse shared shell styling.

## Creator interactions
Add node via visible Add, palette drag, keyboard or port-context filtered search. Connect/rewire typed ports by mouse/pen/touch with reasoned error for incompatible types; hit sizes from ThemeManager. Select/edit with inspector, duplicate/delete with keyboard and visible controls; undo/redo, copy/paste, group/collapse, names and comments. Grid snapping is toggleable independently of grid visibility; pan/zoom stable across viewport and pixel density.

Execution nodes show entry type and event; Conditions show outcomes; Effects show the exact v1 ECS operation; typed Data nodes show input/output type; Delays are durable scheduler jobs (not unmanaged C# threads). `[MudGraphCallable]` functions produce typed nodes with source links and migration diagnostics. Missing function, circular unbounded flow or invalid effect blocks publish.

## Accessibility and debugging
No hover-only command. Tap/focus displays concise tooltip with keyboard/reader accessible equivalent. Graph is navigable using keyboard and ordered node/edge list. Touch/pen gesture disambiguation, reduced motion, scaled text and high contrast read from ThemeManager. Executed paths in an isolated real ECS test world can be inspected by trace; no fake positive display. Large graphs virtualize nodes/edges and throttle redrawing under measured budgets.

## User-demo milestones
- [S09.3](../../05-sprints/phases/S09.md): user pans and zooms **continuous dark graph-paper lines** and selects a custom theme with no dotted backdrop.
- [S11.7](../../05-sprints/phases/S11.md): user creates typed graph equivalent to a C# hook and inspects real matching ECS state.
- [S12Q](../../05-sprints/phases/S12Q.md): user authors an actual quest/dialogue/reward graph and tests as two players.

No separate graph style palette, font, pixel constants, hover theme or node-level color authority may be specified in other feature files.
