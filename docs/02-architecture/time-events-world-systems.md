# World Time, Events, Global Systems and Region Spawners

**Status:** binding scheduler/world-system semantics; runtime implementation pending. **Owner:** scheduler + event dispatcher + world-systems runtime.

## Unified execution primitives
- **WorldClock:** simulation time, real-time mapping, pause/resume policy, tick cadence, catch-up policy, time dilation (if enabled), monotonic ordering, seeded randomness. All schedule-dependent game logic reads one world clock.
- **System registry:** system ID, phase, query/scope, read/write sets, schedule, priority/dependency, version, error policy, enabled state. World-level systems are not implemented as random UI timers or duplicated classes.
- **Typed event envelope:** immutable event type/version, world ID, sequence, timestamp, emitter, actor (optional), subject, correlation/causation IDs, payload, visibility and origin. Events describe committed facts; commands request actions.
- **Event dispatch:** subscriptions by type/scope, deterministic ordering and maximum depth/steps; event handlers enqueue validated commands rather than causing unbounded synchronous recursion.
- **Scheduled action:** durable next-fire time, repeat policy, optional jitter defined by named setting, owner/scope, cancellation token, idempotency key and failure/backoff. Scheduler rebuilds state on resume.

## Scheduling domains and scale

The **WorldClock** is the common authority for time and durable deadline ordering, **not one giant weather-style timer**. The scheduler multiplexes independent domains: world/region systems (usually sparse, long-running deadlines), per-entity routines, and potentially **hundreds or thousands of active encounter-local clocks**. An encounter owns its own phase, turn cursor, casts, cooldowns, reaction windows and cancellation generation; it does not get a private OS thread or a dedicated polling loop.

The engine schedules only the **next actionable deadline** for each active encounter/timer (priority queue or equivalent indexed timer wheel), dispatches due work in bounded batches, and reschedules as needed. Idle encounters have no active polling. Cancellation, movement, death, pause, disconnect and ending the encounter invalidate stale pending occurrences through owner/generation keys. Combat jobs have per-world and per-domain CPU/work budgets so a mass of battles cannot starve authentication, commands, weather or persistence. Metrics expose queue depth, late deadlines, active encounters, processed work, rejected work and event-loop latency.

World/region timers and combat deadlines may follow different pause, catch-up and persistence policies, chosen explicitly by the ruleset: e.g. a paused turn can retain its turn cursor; a real-time cast can cancel or resume after a restart. Never blindly run hundreds of missed attacks or cooldown ticks during catch-up; use bounded coalescing/expiry semantics. All actions still commit via the authoritative ECS/event/outbox boundary. Use the same scheduler service for scripts, quests, NPC routines, weather, travel and encounters, while keeping their independent domain policies.

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
Trigger is an event subscription + condition + bounded action, optionally attached to door, object, room, region or world system. An interactable object may carry custom fields, container inventory, access requirements and multiple actions. State mutation only via command gateway; triggers commit at most once per event+rule+entity onceKey, with durable effectively-once observation after deduplicated outbox retry.

## Timer and catch-up decisions
Real-time games versus turn-based games are both REQUIRED capabilities from v1.1. World simulation uses UTC instants plus configured world-clock scale; paused worlds freeze simulation deadlines, while real UTC timestamps continue. On recovery, coalesce missed periodic weather/spawn ticks into one latest-state reconciliation per scheduler entry; do not replay each missed occurrence. Per-event expiry and recovery are persisted and independently tested. Per-entity tick cadence may override world defaults only under bounded scheduler budgets and documented fairness.

## Quest events
Quest progression receives typed committed events from interactable objects, weather, NPC spawners and train travel. All checks go through the central quest Condition Registry, never private system copies. See [quest progression](quest-progression-and-phasing.md).

## Verification
- Fixed seed+event log produces reproducible weather/spawn outcomes within defined replay contract.
- Pause/restart retains scheduled spawns, weather state, next-fire times and caps.
- Overlapping region spawners obey per-spawner and global caps.
- Invalid graph script can't create infinite event loop; engine isolates and reports it without corrupting world.
- Multiple worlds have independent clocks, weather, seed and entity populations.
- NPCs spawn to correct location with permissions and move through same spatial API as player characters.
