# Spatial Model, Nested Containers, Moving Rooms and Dynamic Exits

**Status:** REQUIRED train/world scenario; binding spatial invariants. **Owner:** spatial + navigation + transit ECS systems. **Dependencies:** ecs-core, command protocol, scheduler.

## Three distinct coordinate systems
1. **Authoring grid:** editor's user-arranged cells (x,y,layer, optional visual groups/color/icon). May place multiple logical room references or visually omit nonspatial entities. It is NOT authoritative physical distance nor an implicit exit.
2. **Topological world:** directed graph of locations and exits, region membership, permissions and traversability. A cell may represent a room, compartment, station, vehicle interior, junction, dungeon etc.
3. **Hierarchical containment:** parent-of relationship placing entities inside rooms, inventories, vehicles, other containers and nested compartments. Runtime visibility, chat and interactions use resolved containment + semantic location, not grid pixel coordinates.

## Location/containment invariants
- An entity has at most one authoritative immediate container/location parent at a time, unless a documented exceptional component models a different relationship (e.g. logical membership). The containment graph must be acyclic.
- Attaching a passenger/item to a moving interior means it moves *with* the parent. Do NOT update every passenger's world cell as train advances. Resolve world position by traversing hierarchy, caching/invalidation as needed.
- Distinguish logical spatial parent, occupied room, region membership, rendering/grid placement and owner/creator; do not conflate them.
- Movement within a carriage changes immediate location, not the train's track progress. A carried item stays with its carrier; containers can nest.
- Destruction/despawn requires a declared policy for contents: reject if occupied; transfer to fallback; cascade delete only when explicitly authorized. This is part of the transaction.
- Visibility and reachability are functions of containment, exits, access rules and entity capabilities. No arbitrary cross-parent interaction just because two grid cells are adjacent.

## Location graph
**Location:** named/described playable place, including rooms inside moving vessels, platform, train cars and open terrain. **Exit:** independently identified directed relation from source location to a destination resolution rule, name, aliases, description, traversal verb, condition/lock policy, visibility policy, trigger hooks, enabled state and lifecycle. Reverse exit only exists if explicitly configured or a creator UI action creates it.
- Static destination references a fixed location ID.
- Dynamic destination resolves through a trusted resolver bound to world state (e.g. train door -> currently docked platform) and returns target or a typed not-available reason. Resolver ownership belongs to navigation/transit.
- An exit's *description* may differ by state and must not be confused with a room's description or traverse success message.
- Locks are predicates with explicit ordering and permissions: hidden vs shown-but-locked vs traversable; consistent feedback. World editor provides rule builder, not only raw string.
- Exit transitions are atomic: validate origin, actor, destination validity, capacity, permissions and world version; then relocate actor and publish exit/travel events. A failing lock never partially moves the actor.

## Trains and moving vehicles
**Track graph:** creator-defined directed/bidirectional track segments/junctions and platform/station attachment rules. Distinct from playable room exits; tracks are transport routing edges and can be modeled as ECS entities or graph assets.
**Train entity:** route plan, current segment/progress, motion state, stop/docking bindings, schedule, occupancy capacity/constraints and contained location graph (cars/corridors). Train car rooms are stable entity IDs throughout motion.
**Canonical transit lifecycle states:** ParkedUnassigned -> Scheduled -> Departing -> InTransit -> Approaching -> Docked -> Departing, with Faulted/Stopped variants. Each transition has entry/exit guards and emits typed events. Route changes require validation. No teleport at intermediate step disguised as motion.

**Travel while moving:**
- Passenger inside TrainCarA can move to TrainCarB via internal exit while train has InTransit state; dynamic reachability is local to train interior, not tied to station.
- Items can be dropped/picked up, NPCs move, triggers fire, scripts run, and persistent variables change without advancing or cancelling train route.
- A station platform's boarding exit and a train door's disembark exit exist only when docking predicate and door/permissions permit; between stations these exits are unavailable or shown as locked per configured visibility.
- Docking creates a *temporary navigable edge* through resolver/binding; it must not permanently rewrite the static room graph or duplicate exits.
- At station A departure, exit resolver stops returning station A. At station B arrival it binds station B. A command racing with departure is atomically evaluated against the current committed docking state.
- An NPC remaining aboard across server restart retains room identity and containment. A platform actor does not accidentally follow train after departure.

## Editing rules
- Creator may reorder/move a map cell without silently modifying game topology or runtime containment.
- Editing exits has source, target/resolver, direction/aliases, description, locks, conditions, and reciprocal-exit controls visible in inspector.
- Deleting station/car/track displays dependent references, affected routes and consequences; commit only when consistent.
- Multiple maps/layers may visualize same runtime location only through explicit linked view; editor must not accidentally create duplicate rooms.

## Exact reference acceptance
See [train-reference-scenario](../04-features/train-reference-scenario.md). Mandatory tests cover nested passengers/items, internal movement in transit, timed docking, conditional exits, concurrent boarding/departure, persistence/restoration, route modification, locked cars, invalid destinations and event/visibility correctness.

## Universal ECS object and exit contract

[Universal objects, exit/door capabilities and traversal](../03-contracts/ecs-objects-and-exits.md) is binding for this spatial subsystem. Every room/exit/door/lever/furniture/character/tool is an ordinary ECS entity; what it can do is defined by components and authoring templates, not a separate class hierarchy. A door is a traversable exit with optional state/interaction/lock components; opposite-facing exit entities may share one durable DoorState entity. Delayed/interruptible exit traversal uses the existing scheduler and validated persistent TraversalOperation, never a private timer. Traversal, LOOK and movement permissions are distinct and observer-authorized. The linked contract defines lifecycle/hook ordering, duration/cancel, recovery, doors and tests; don't invent conflicting exit semantics here.
