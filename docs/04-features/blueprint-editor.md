# Entity Blueprint Editor and Visual Graph Authoring

**Status:** REQUIRED Blueprint-style ECS object creation; PROPOSED UI contract. **Owner:** asset editor + graph editor.

## Design goal
Unreal-style discoverable visual editing, without binding MudMaker to Unreal's runtime. Creators assemble custom data-defined game entities as reusable visual blueprints, attach any validated ECS component (built-in or creator-defined), assign properties, nest child templates and attach event/action graphs or custom scripts. Engine capabilities, not handcoded entity-category menus, determine allowed behavior.

## Screens and panels
- Blueprint Library: search, favorite, tags/categories, dependencies, versions, rename/duplicate/delete/publish; inspect where used.
- Central composition graph: Entity Root, component nodes and typed links/slots; collapsible nested children for train cars/doors, item containers and AI actors.
- Component inspector: schema-driven editor controls, defaults, validation, units, enumeration, range, rich text, references to other assets and optional exposed parameters.
- Behavior graph tab: event hooks, conditions, actions and typed flow connections; visual errors and step-through trace.
- Quest / Dialogue panel: bind NPCs/objects to conditional quest interactions, dialogue, phase visibility, typed events and narration using shared ECS services. See [Quest System](quests/INDEX.md).
- Scripts panel: attach script asset with explicit input/output/capabilities/trigger binding, inspect compile/security errors and version.
- Instance tab: compare blueprint defaults with instance overrides, apply/revert selected changes with visible consequences.
- Live preview/test: spawn isolated sample entity into test world and inspect component state, emitted events and graph execution.

## Component schema editing
UI supports create namespaced component type, primitive/array/map/struct/reference fields (supported type list must be fixed by ADR), defaults, required/nullable, validation ranges, enums, editor-facing labels/help, persistence/replication policy, and migration version. Component schema is reviewed before referenced blueprints publish. Never use an untyped arbitrary JSON blob as the only method for all custom fields.

## Asset composition and references
Entity Blueprint has stable ID and version, named child slots, component attach points, default values, exposed parameters, reference constraints, dependency graph and required capability tags. Entity instantiation resolves child slots to unique entity identities. Blueprint can reference other blueprints; cyclic containment is prevented. Reuse favors composition over inheritance class trees. Exact template inheritance policy is OPEN.

## Graph mechanics
Typed ports and compatibility errors; search-to-add node palette grouped by ECS component read/write, flow, queries, spatial navigation, inventory, transit, scheduling, world actions, messaging and custom extensions. Drag connectors with snap, rewire, duplicate, group/comment, copy/paste, zoom/pan, undo/redo and keyboard alternatives. Support debugging: breakpoints where feasible, trace, inspected values, event source, last failure, budgets; never hide infinite-loop diagnostics.

## Example: Train Blueprint
Components: Name, RouteFollower, MotionState, Interactable, ContainerRoot, Doors, ChildSlots. Child Blueprints: Car A, Car B and their interior Location entities; each car has Exits, optional NPC/item slots, region membership and behavior. Exposed parameters: train display name, route reference, capacity, door rules, timetable, optional special action. Behavior graph binds OnDock to event/door state and OnDepart to close boarding exits via approved transit action. The blueprint does not move individual occupants per route tick.

## Other examples
- Ticket dispenser with stock count, inventory output, permission checks, OnInteract graph and persistent transaction records.
- NPC with dialogue graph, inventory, AI behavior hooks, spawn ownership and safe path navigation.
- Weather system as reusable WorldSystem blueprint bound to region(s), schedules and parameterized effects.
- Ore spawner with region filter, max counts, cooldown, placement validation and cleanup rules.

## Acceptance
Creator makes a new custom component, blueprint, instances, per-instance override, event graph and script attachment without editing engine source. Validation catches bad port/ref/type and asset migration. Reopen project preserves exact graph behavior; published version restores deterministically. All visual and script mutations use same ECS gateway.
