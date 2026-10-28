# World Time, Events, Global Systems and Region Spawners

**Status:** REQUIRED authoring of weather, NPC/resource spawners and global systems; PROPOSED runtime semantics. **Owner:** scheduler + event dispatcher + world-systems runtime.

## Unified execution primitives
- **WorldClock:** simulation time, real-time mapping, pause/resume policy, tick cadence, catch-up policy, time dilation (if enabled), monotonic ordering, seeded randomness. All schedule-dependent game logic reads one world clock.
- **System registry:** system ID, phase, query/scope, read/write sets, schedule, priority/dependency, version, error policy, enabled state. World-level systems are not implemented as random UI timers or duplicated classes.
- **Typed event envelope:** immutable event type/version, world ID, sequence, timestamp, emitter, actor (optional), subject, correlation/causation IDs, payload, visibility and origin. Events describe committed facts; commands request actions.
- **Event dispatch:** subscriptions by type/scope, deterministic ordering and maximum depth/steps; event handlers enqueue validated commands rather than causing unbounded synchronous recursion.
- **Scheduled action:** durable next-fire time, repeat policy, optional jitter defined by named setting, owner/scope, cancellation token, idempotency key and failure/backoff. Scheduler rebuilds state on resume.

## Regional systems and weather
A creator can define: WorldWeather with state/transition graph, target regions, probabilities/conditions, minimum/maximum duration, season/time effects, local overrides and event output. A region is a semantic membership set (spatial region entity or query), not purely the map grid's color. Weather changes expose queryable state and optional look-description/exit modifiers; must be explicitly wired, not magical global effects.

Creation workflow: choose New World System -> Weather -> choose region(s) -> parameterize cycles and effects in forms/nodes -> validate -> preview deterministic timeline -> attach to project -> publish. Advanced creators may attach scripts via same engine mutation API.

## NPC/resource spawners
A spawner is a configured system or system entity with: world/region/room selectors, spawn blueprint reference+version, eligible location predicate, time/rate policy, capacity limit, per-location cap, initial count policy, distance/player-presence policy, random distribution policy/seed, despawn policy, failure behavior, audit metrics.
- No spawner may place an NPC inside invalid or inaccessible containment, ignore capacity or generate orphan items.
- Capacity is checked atomically with spawn; concurrent events cannot exceed cap.
- Global and region caps have explicit precedence. Resource renewal must not duplicate unique persistent items after restart.
- When a region has zero eligible spawn locations, system reports a typed no-location result and remains healthy per policy, not a silent infinite retry.
- Despawn policies distinguish world-owned ecology NPCs from owned/quest-persistent instances.

## Triggers and interactivity
Trigger is an event subscription + condition + bounded action, optionally attached to door, object, room, region or world system. An interactable object may carry custom fields, container inventory, access requirements and multiple actions. State mutation only via command gateway; trigger fires exactly according to event semantics (at-most-once vs effectively-once with deduplication is OPEN and must be documented per event class).

## Timer and catch-up decisions
Real-time games versus turn-based games are both REQUIRED capabilities from v1.1. Exact semantics for offline time, missed spawn windows, missed weather transitions, time zone handling and paused worlds are OPEN; choose policies before coding and test each. Per-entity tick cadence may override world defaults only under bounded scheduler budgets and documented fairness.

## Verification
- Fixed seed+event log produces reproducible weather/spawn outcomes within defined replay contract.
- Pause/restart retains scheduled spawns, weather state, next-fire times and caps.
- Overlapping region spawners obey per-spawner and global caps.
- Invalid graph script can't create infinite event loop; engine isolates and reports it without corrupting world.
- Multiple worlds have independent clocks, weather, seed and entity populations.
- NPCs spawn to correct location with permissions and move through same spatial API as player characters.
