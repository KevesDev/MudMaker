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


## Complete registered-feature placement and access map

This section maps **every currently registered control** to a visual home. It is a **default-layout and discoverability contract**, not a requirement that every control be visible simultaneously. The canonical catalog continues to define action IDs, permission, states and tests; each listed ID retains its contract. No new feature or unregistered action is implied by a menu grouping. Menu destinations which require new UI controls must be registered during implementation.

### editor.shell

**Where:** Top shared Creator toolbar / active-document strip.

**Presentation:** Immediate actions: Save, Undo/Redo; Validate/Test/Publish grouped as Build menu when crowded; Search/View/Help in compact menus.

**Registered features (13):** `editor.shell.01` Save; `editor.shell.02` Save All; `editor.shell.03` Undo; `editor.shell.04` Redo; `editor.shell.05` Validate; `editor.shell.06` Play Test; `editor.shell.07` Publish; `editor.shell.08` Global Search; `editor.shell.09` View Panels; `editor.shell.10` Help; `editor.shell.11` Project Title; `editor.shell.12` Save Status; `editor.shell.13` Workspace Tabs.

### editor.assets

**Where:** Collapsible left Asset Explorer, open via View → Assets or asset-search shortcut.

**Presentation:** Asset actions in Explorer header and selected-item context menu; dependencies as inline details.

**Registered features (10):** `editor.assets.01` Asset Explorer; `editor.assets.02` Asset Search; `editor.assets.03` Asset Filter; `editor.assets.04` New Asset; `editor.assets.05` Import Asset; `editor.assets.06` Duplicate; `editor.assets.07` Rename; `editor.assets.08` Delete; `editor.assets.09` Find Uses; `editor.assets.10` Dependencies.

### editor.map

**Where:** Main document → Map canvas; slim canvas-specific tool strip.

**Presentation:** Room/exit tools together; layers/regions and grid/snap/zoom grouped in strip; selection details in Inspector.

**Registered features (18):** `editor.map.01` Map Canvas; `editor.map.02` Select Tool; `editor.map.03` Place Room; `editor.map.04` Paint; `editor.map.05` Connect Exits; `editor.map.06` Track Tool; `editor.map.07` Erase; `editor.map.08` Floor or Layer; `editor.map.09` Region; `editor.map.10` Grid Visible; `editor.map.11` Snap; `editor.map.12` Zoom In; `editor.map.13` Zoom Out; `editor.map.14` Fit Map; `editor.map.15` Minimap; `editor.map.16` Add Exit; `editor.map.17` Link Room; `editor.map.18` Cell Selection.

### editor.inspector

**Where:** Selection-driven right Inspector drawer.

**Presentation:** Inline typed fields and component group actions; show error/origin beside relevant field.

**Registered features (10):** `editor.inspector.01` Inspector; `editor.inspector.02` Name; `editor.inspector.03` Description; `editor.inspector.04` Type; `editor.inspector.05` Add Component; `editor.inspector.06` Remove Component; `editor.inspector.07` Reset Override; `editor.inspector.08` Open Source Blueprint; `editor.inspector.09` Field Origin; `editor.inspector.10` Validation Errors.

### editor.blueprint

**Where:** Main document → Blueprint.

**Presentation:** Graph dominates; structural actions in contextual header; Defaults/Instance/Behaviors are selection-specific segmented modes not a permanent giant tab shelf.

**Registered features (9):** `editor.blueprint.01` Blueprint Graph; `editor.blueprint.02` New Blueprint; `editor.blueprint.03` Add Child; `editor.blueprint.04` Add Component; `editor.blueprint.05` Dependencies; `editor.blueprint.06` Defaults; `editor.blueprint.07` Instance; `editor.blueprint.08` Behaviors; `editor.blueprint.09` Preview Entity.

### editor.graph

**Where:** Main document → Graph.

**Presentation:** Node search/add in canvas command strip; layout/debug/testing in secondary graph menu.

**Registered features (13):** `editor.graph.01` Graph Paper; `editor.graph.02` Node Search; `editor.graph.03` Add Node; `editor.graph.04` Connect; `editor.graph.05` Disconnect; `editor.graph.06` Group; `editor.graph.07` Auto Layout; `editor.graph.08` Fit Graph; `editor.graph.09` Snap Nodes; `editor.graph.10` Show Graph Grid; `editor.graph.11` Trace; `editor.graph.12` Validate Graph; `editor.graph.13` Run Test.

### editor.code

**Where:** Main document → Code.

**Presentation:** File tree collapsible; code editor center; diagnostics open via error or View → Output.

**Registered features (10):** `editor.code.01` Script Files; `editor.code.02` Code Editor; `editor.code.03` Search Code; `editor.code.04` Insert Reference; `editor.code.05` Hook Picker; `editor.code.06` Format; `editor.code.07` Build; `editor.code.08` Test Hook; `editor.code.09` Diagnostics; `editor.code.10` Binding Status.

### editor.quest

**Where:** Main document → Quests & Dialogue.

**Presentation:** Quest tree collapsible; active stage/dialogue canvas center; actions adjacent to selected quest.

**Registered features (10):** `editor.quest.01` Quest List; `editor.quest.02` New Quest; `editor.quest.03` Add Stage; `editor.quest.04` Add Objective; `editor.quest.05` Add Dialogue; `editor.quest.06` Add Choice; `editor.quest.07` Add Reward; `editor.quest.08` Test as Actor; `editor.quest.09` Dialogue Graph; `editor.quest.10` Quest Problems.

### editor.world

**Where:** Main document → World Systems.

**Presentation:** Single system list with focused event/spawn/region editor; tests/traces open contextually.

**Registered features (7):** `editor.world.01` World Systems; `editor.world.02` New Event; `editor.world.03` New Spawner; `editor.world.04` Edit Schedule; `editor.world.05` Edit Region; `editor.world.06` Test Tick; `editor.world.07` Event Trace.

### editor.commands

**Where:** Main document → Commands.

**Presentation:** Command list on demand; selected definition in one focused form; collision/try tools near form.

**Registered features (11):** `editor.commands.01` Command Library; `editor.commands.02` New Command; `editor.commands.03` Command Name; `editor.commands.04` Scope; `editor.commands.05` Arguments; `editor.commands.06` Conditions; `editor.commands.07` Action; `editor.commands.08` Help Text; `editor.commands.09` Collision Check; `editor.commands.10` Try Command; `editor.commands.11` Syntax Preview.

### editor.diagnostics

**Where:** View → Problems / Test Output / Execution Trace / Build Logs.

**Presentation:** One bottom output drawer, one active feed at once; auto-open on actionable failure.

**Registered features (7):** `editor.diagnostics.01` Problems; `editor.diagnostics.02` Test Output; `editor.diagnostics.03` Execution Trace; `editor.diagnostics.04` Build Logs; `editor.diagnostics.05` Copy Diagnostic; `editor.diagnostics.06` Go to Issue; `editor.diagnostics.07` Clear Completed.

### editor.publish

**Where:** Creator toolbar → Build/Publish → Review Release.

**Presentation:** Focused modal/page for review, diff, progress; destructive confirm; never a persistent side card.

**Registered features (7):** `editor.publish.01` Release Summary; `editor.publish.02` Affected Assets; `editor.publish.03` Migration Warnings; `editor.publish.04` Review Changes; `editor.publish.05` Publish Release; `editor.publish.06` Cancel; `editor.publish.07` Publish Progress.

### editor.preferences

**Where:** Settings → Appearance / Shortcuts / Layout / Accessibility.

**Presentation:** Settings modal/view; Appearance includes Theme, customization/import/export/reset.

**Registered features (9):** `editor.preferences.01` Theme; `editor.preferences.02` Customize Theme; `editor.preferences.03` Import Theme; `editor.preferences.04` Export Theme; `editor.preferences.05` Reset Theme; `editor.preferences.06` Edit Shortcuts; `editor.preferences.07` Reset Layout; `editor.preferences.08` Reduced Motion; `editor.preferences.09` Accessibility.

### editor.navigation

**Where:** Top toolbar → Go To (Play / Host / Home).

**Presentation:** No clickable Create item; active-host indicator conditional; remove obsolete Play connected-state outside Play.

**Registered features (7):** `editor.navigation.01` Go To; `editor.navigation.02` Create; `editor.navigation.03` Play; `editor.navigation.04` Host; `editor.navigation.05` Splash; `editor.navigation.06` Hosting in Background; `editor.navigation.07` Client Connections.

### editor.navigationGuard

**Where:** Go To while draft unsaved → single transition dialog.

**Presentation:** Keep Draft & Switch / Save & Switch / Cancel, with honest pending/save feedback.

**Registered features (5):** `editor.navigationGuard.01` Unsaved Project Changes; `editor.navigationGuard.02` Keep Draft and Switch; `editor.navigationGuard.03` Save and Switch; `editor.navigationGuard.04` Cancel; `editor.navigationGuard.05` Save Before Switching.

## Visual audit rule for this workspace

A Builder must demonstrate a discoverable route to each registered feature, with valid disabled/error states and keyboard access, without promoting every control to the main toolbar or leaving every panel visible. Existing contract-mandated tabs represent document/session or contextual mode switching; default navigation must not become a permanently stacked tab wall. Any mismatch between this map and a feature contract is resolved through an explicit indexed documentation change, not agent invention.

## Owner implementation decisions (2026-10-30)
- Panel visibility is chosen with a single View Panels control that cycles through the closed state, Assets drawer, and Assets plus Inspector.
- The graph-paper canvas is the dominant surface; its grid and snap toggles sit in the canvas strip. The theme keeps large surfaces dark and near-black; saturated palette colors are for accents, borders and focus only.
- Empty asset folders show no placeholder text.
