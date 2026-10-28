# 02 | Modern Visual Graph Editor

**Status:** REQUIRED polished node-based behavior creation; PROPOSED detailed UI. **Owner:** shared Graph Canvas and Typed Node Registry; engine graph plan is separate from canvas. Read [scripting UX index](INDEX.md).

## Visual direction
A premium creative-software workspace, not legacy square boxes with dense thin wires. Quiet dark/light surfaces, faint dotted canvas, rounded compact cards with short verb-first labels and icons, subtle depth, restrained semantic colors for Events / Conditions / Actions / Data / Async, smooth curved links, ample breathing space. Each node shows title, icon, main parameter and ports; descriptive paragraphs belong in contextual tooltip/inspector. Node color is not the only type indicator. Group frames and subgraphs prevent spaghetti.

## Desktop regions
- Header: Project > Blueprint/Quest/System > Graph, dirty/validated/published state, **Save**, **Validate**, **Test ▾**, **Arrange**, search and overflow.
- Left: searchable palette grouped Events, Flow, Conditions, Entities/Components, Queries, Movement, Items, Quest/Dialogue, Rewards, World Events, Narration, Custom Code, Recent, Favorites.
- Center: pan/zoom graph with grid/minimap, fit-to-content, selection, typed port connections, align/distribute, group/comment and reversible auto-layout.
- Right inspector: **Selected Node, Properties, Connections, Help, Validation**, with typed dropdowns, asset/quest/entity pickers, script function selector and capability notes.
- Bottom drawer: Problems, trace, event correlation, effect plans, final ECS mutation and per-observer outputs.

## Exact gestures and actions
**Add Node (+):** toolbar, palette drag or drag from typed port to open context-filtered search; keyboard command and large tap-friendly alternative. **Connect:** click/tap source and destination ports; show type compatibility; reject illegal wiring with reason. **Edit:** select node, right inspector shows schema-generated fields and optional short tooltip. **Delete/Duplicate:** contextual toolbar, keyboard menu, no hover-only behavior. **Group/Collapse:** boxes or named subgraphs with clear inputs/outputs; complex graph searchable and navigable. **Undo/Redo:** typed asset edits, not active gameplay. **Test/Debug:** highlight real executed path and validated effects, expose values and step/breakpoint only in test world; never render fake trace.

## Node designs by kind
Event nodes are recognizably entrypoints, with event name and context. Conditions show True/False branches. Actions show requested ECS effect and success/failure paths. Data nodes expose typed inputs/output. Delay/async nodes show durable workflow semantics rather than starting free-floating timers. Script function nodes show code-source icon and readable parameter names and tooltip, linking to exact versioned script. Invalid/missing script nodes are flagged and cannot publish. Each graph category (Blueprint composition, behavior, quest chain, objective, dialogue, world system) applies shared gesture language but distinct permitted node types.

## Tooltips and usability
Hover/focus/tap info opens compact 1–2 sentence **What it does / When it runs / Requires** tip, with optional More details in Help inspector. Bad port connects show "Expected Character reference; received Text", not obscure compiler error. Advanced capability fields and retry/transaction rules are collapsible, discoverable and validated before publish. Status and error actions always accessible without hover.

## Tablet, accessibility and performance
Bottom/side drawers, explicit connect mode, larger port hit areas, separate pan/pinch from node dragging, screen-reader accessible node/edge list and keyboard focus navigation. Reduced motion disables trace animation. Large graphs virtualize view and do not rerender all nodes per keystroke; performance budgets measured on real tablets. No UI-specific executable graph shortcuts that bypass typed runtime.
 
## Example acceptance
Bob's OnInteract -> QuestIsActive -> scripted Quiz -> on correct answer GrantReward AND StartFestival (or otherwise use normal dialogue). Test first by server-backed preview and then real two-client world; invalid graph link cannot publish, both observers see allowed narration only; C# function exposed to palette correctly types its ports. Separate saved version can be published and rolled back without reassigning every NPC.
