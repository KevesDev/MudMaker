# ECS Core — Identity, Components, Queries, Systems and Safety

**Status:** ECS requirement CONFIRMED; identity/storage/writer decisions in ADR-RECORDS-S01 supersede older OPEN/proposed language below. Production identity refinement is [S03.1](../05-sprints/specs/S03-1-SPEC.md): opaque cryptographic 128-bit WorldId plus uint32 index/generation, one owner, no generation wrap. Other unassigned mechanics remain proposals. **Owner:** ECS runtime. **Dependencies:** system-boundaries.

## Mandatory ECS principles
**Binding large-world requirement:** hundreds/thousands of composed objects, safe runtime spawning, distinct template/runtime identities, monitoring and replication must be supported. [Scale/identity/replication gates](ecs-scale-and-identity-gates.md) map this owner clarification to actual sprint phases and measured acceptance; current native implementation is not production-scale verification.

- Runtime game concepts are entities with identity and component composition. Behavior lives in systems or registered graph/script hooks; entities are not gameplay class inheritance trees.
- Support builtin and creator-defined component schemas as first-class data. Schemas are inspectable, versioned and available to visual editors, runtime validation and serialization.
- An entity may represent: player character, NPC, item, door, train, platform, train interior room, track segment, region controller, spawn point, weather controller, scheduled event or a globally scoped world service instance. Being an entity does not require rendering on map.
- Any specialized template is *composition*, not a permanently hard-coded engine class.
- The selected storage architecture is the ADR-002 hybrid confirmed by S01.5: archetypes for co-occurring hot components, sparse sets for tags/high-churn components. Production workload evidence is still required; the spike is not a scale claim for the engine.

## Canonical terms and contracts
**EntityId:** complete opaque 128-bit WorldId plus uint32 index and uint32 generation, per ADR-002/S01.6 and S03.1. One native identity domain issues cryptographic world namespaces and retains issued IDs for its lifetime; no caller-selected namespace. A maximum-generation slot retires rather than wraps. Blueprint identity is separate from instance identity; durable restore belongs to S04.

**ComponentTypeId / ComponentSchemaVersion:** stable opaque 128-bit component and field IDs, readable namespaced type names and positive schema revision. [S03.2](../05-sprints/specs/S03-2-SPEC.md) defines one typed logical-schema/default validator, immutable descriptors and a one-way release freeze; built-in and creator schemas share validation and reserved built-ins cannot be claimed by creators. Serialization/editor/migration metadata is inspectable; their runtime processors are later assigned work, not registry features already proved. Example creator component: transit.ticket {class: string, validated: boolean}.

**Component instance:** data attached to EntityId, with explicit ownership and mutation authority. Prefer data-only, no hidden business logic or Spring service inside a component. Mutability strategy and allocation targets are ADR items; immutable data records may be used at boundaries, not mandated as internal ECS storage.

**EntityTemplate/Blueprint:** reusable versioned set of component definitions, defaults, optional child entities, permitted custom graph/scripts. Multiple instances can override approved fields. Template edits have explicit migration/propagation policy; no silent overwrite of running instances.

**WorldInstance:** isolated ECS registry, clock, scheduler, event stream, access policy, persistence cursor, source project version and instance ID. Global Java singletons may not store game-specific state.

**SystemDefinition:** uniquely registered system identifier, phase, read set, write set, eligibility query, scheduling policy, dependency constraints, failure behavior, metrics and a test contract. Systems may run over entity query results, event matches or scheduled targets. A declared write set is enforced, not merely documentation.

**Query:** typed selection by required/optional/excluded component type and optional scope; iteration order must be defined for deterministic systems or explicitly declared nondeterministic for read-only usage.

## Mutations
Proposed command/transaction API operations: createEntity, destroyEntity(policy), addComponent, removeComponent, patchComponent(typed change), attach/detach/transfer containment, register blueprint instance and publish domain action. Every operation validates schema + referential/spatial invariants + access permissions before commit. There must be one authoritative mutation gateway; systems must not bypass it with arbitrary registry writes.

- Atomic commands: validation failure commits no mutation, emits no success event, returns a structured error.
- Commands requiring multiple entity updates (e.g. boarding a train and updating occupancy) are one transaction.
- Lifecycle order: creation -> schema validated -> components installed -> containment registered -> post-commit events emitted; destruction requires inbound reference policy and despawn events.
- All references are typed and checked for target existence, world scope and allowed target capability.
- Lost/missing entities return explicit errors, never implicit recreation or null-unsafe behavior.
- User-defined custom components cannot grant administrative permissions solely by naming a field.

## Scheduling and performance
System phases proposed: validate intent -> simulation update -> scheduled behaviors -> effects/event processing -> commit -> snapshot/publish. The exact execution model and ordering MUST be recorded before code. No system may spin its own tick thread. Define bounded budgets for processing event recursion, graph steps, script CPU, timed actions and queue backpressure. Defaults must come from named configuration + measurable benchmarks, not embedded literals.

## Example composition (illustrative, not shipped)
- TrainEntity = Named + RouteFollower + MotionState + ContainsLocations + Interactable + TransitDoorBindings.
- TrainCarInterior = Location + SpatialParent(train entity) + Containment + Exits.
- Passenger = Character + LocatedIn(train interior) + Inventory + SessionBinding.
- Door = Interactable + Lockable + DynamicExitEndpoint + TriggerBindings.
- WeatherController = RegionScope + ScheduledBehavior + WeatherParameters + State.
These names are **proposed** descriptive contracts, not instructions to instantiate exactly these concrete Java classes.

## Non-negotiable tests
1. Attach, query, patch and remove creator-defined component while observing correct schema enforcement.
2. Two world instances cannot read or mutate each other's entities by accidental ID collision.
3. Destroying an entity with nested contents exercises explicit policy rather than orphaning or duplicating children.
4. Conflicting writes and stale-version changes reject/retry per documented concurrency contract, not nondeterministically overwrite.
5. Component schema migration preserves or explicitly quarantines data.
6. Deterministic replay under same input and clock yields same canonical ECS state (modulo documented random seed and external events).
7. Benchmarks record entity counts, query costs, mutation latency, event throughput and allocations with agreed budgets; do not claim scale from design alone.

See [spatial/containment/transit](spatial-containment-transit.md), [persistence](state-persistence.md), [quality](../06-quality/test-matrix.md).
