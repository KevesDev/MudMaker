# ECS scale, identity, lifecycle and replication gates

**Owner requirement, 2026-10-31:** large MUD worlds with hundreds and thousands of ECS objects, including runtime spawning, reusable templates, monitoring and replication, are a binding design target. This is not an implemented scale claim. Existing ADR-002/003 hybrid storage/single writer and S01.6 identities remain authoritative. [ECS core](ecs-core.md), [persistence](state-persistence.md), [world systems](time-events-world-systems.md), [protocol](../03-contracts/protocol-and-hosting.md), [test matrix](../06-quality/test-matrix.md).

## Identity and ownership

- Template/Blueprint identity is a stable asset GUID **plus revision** (S04.1/3), distinct from any live instance. Each spawned instance gets its own native EntityId and records the originating template/revision and approved overrides. Editing a template does not silently rewrite existing instances.
- Live EntityId is the complete opaque128-bit WorldId plus uint32 index/generation. It is not a template ID, name, pointer or component type ID. Despawn/reuse increments generation; maximum generation retires rather than wraps. Spawn and all other mutations use the same native writer; a parsed GUID reference grants no allocation or access authority.
- ComponentTypeId and FieldId are distinct stable128-bit identities with schema revisions, not per-instance object identities. Names remain readable metadata. IDs must survive boundary conversion without truncation, namespace collapse or JavaScript-number corruption of64-bit values.
- Durable restore must explicitly define namespace/instance identity continuity, duplicate-loaded-world rejection, reference remapping if necessary, issued/retired identities and template provenance before its implementation (S04.5). Runtime allocation alone does not prove restart-safe identity. No speculative second persistent-ID manager is authorized here.

## Scale and monitoring

- Every active object is composed ECS data. Queries use the selected archetype/sparse indexes and bounded results; no whole-world copy/poll or one timer/thread per entity. High-churn spawning/despawning and component changes must preserve row/index/reference integrity without a separate canonical object store.
- IPC frame/value limits are **per request/inspection**, never a world population cap. Inspector/query/replication surfaces need bounded pages/batches and explicit continuation/resync behavior. Raising frame size or dumping all objects is not a scale solution.
- Native metrics have one owner and bounded collection: live/free/retired identity counts, component/archetype/sparse occupancy, actual memory/allocation evidence, lifecycle rates, query visited/returned work and latency, writer/event/replication queue depth, rejection/overflow/resync counts as those owners ship. UI consumes snapshots of these facts; metrics must not scan/copy the whole world every frame or retain unbounded per-object history.
- Production workload evidence must include hundreds and thousands of composed entities, sustained spawn/despawn and reuse, mixed sparse/archetype mutations, reference integrity, bounded queries, multiple-world isolation and memory behavior. Record hardware/build/configuration, populations/composition, warm/cold behavior, p50/p95/p99 timings, RSS/allocations and failures. Freeze named workload/acceptance budgets before executing the assigned gate. S01.5's spike selects storage; it does not verify production scalability. ADR-012 quantitative thresholds remain unresolved until that phase's review.

## Replication readiness

- Replication follows committed native state and revisions/events, with distinct create/update/despawn semantics and stale-generation rejection. Templates are referenced by versioned asset identity; they do not supply a shared runtime object ID.
- Client projections must be filtered by authenticated actor/world/visibility/interest. A private/hidden component must not leak through a general ECS dump. Leaving a client's visible set is distinct from destroying the server object.
- Define initial baseline, ordered deltas, revision gaps, stale/duplicate/out-of-order handling, bounded backpressure, reconnect/resync and destruction tombstone/ID-reuse behavior before implementation. A lagging replica cannot become authoritative or overwrite the native writer.
- Owner directed Evennia's behavior as the feature/quality reference rather than asking them to select a distributed architecture. Lead interpretation: replication here keeps each connected player's authorized view synchronized as server-owned ECS objects spawn, change, move and despawn. Exact remote transport/auth/reconnect choices remain ADR-008/S07 gates; cross-server failover is not inferred from the cited baseline.

## Evennia feature baseline, reviewed against primary documentation

| Documented behavior | MudMaker contract/phase implication |
|---|---|
| [Prototypes](https://www.evennia.com/docs/latest/Components/Prototypes.html) describe reusable definitions and per-instance configuration; spawning creates individual game objects; builders can save/search/edit prototypes | Versioned Blueprint asset GUIDs, distinct live ECS instance IDs, source revision/override provenance and explicit propagation in S04/S09/S10. Gameplay behavior stays ECS composition/systems |
| [Object API](https://www.evennia.com/docs/latest/api/evennia.objects.objects.html) exposes object identity separately from names and object state | Our approved complete WorldId/index/generation reference remains distinct from template/schema/field identity; durable identity/reference readback is an actual S04 gate |
| [Message path](https://www.evennia.com/docs/latest/Concepts/Messagepath.html) routes commands into the server and server-origin messages/status through sessions; [sessions](https://www.evennia.com/docs/latest/Components/Sessions.html) select the connected recipient | Use one authoritative native world with typed, visibility-filtered client projections and lifecycle updates. This is the reference for the S07.18 replication plan; a client cache is a view of state |
| [Server load](https://www.evennia.com/docs/latest/api/evennia.commands.default.system.html#evennia.commands.default.system.CmdServerLoad) exposes load, memory and cached-object counts; [profiling](https://www.evennia.com/docs/latest/Coding/Profiling.html) includes real connected-client workload/response measurement | Native object/storage/lifecycle metrics in S03.8a, production workload evidence in b, real network/recovery evidence in S07.18c and host display in S17.10. Synthetic storage timing alone is insufficient |

These are behavior references, not a decision to adopt Python typeclasses/ORM storage or copy Evennia's internal handlers. The approved native ECS, one writer, typed contracts and versioned assets remain the implementation architecture. No new benchmark/test is authorized by this review.

## Explicit phase ownership

| Phase | Binding deliverable/gate |
|---|---|
| S03.4a | Preserve full IDs/typed values; bounded codec policy is not an entity-count limit; no scale/replication claim |
| S03.5 | Indexed bounded query contract and integrity under lifecycle churn |
| S03.6 / S03.7 | Revision guard, then atomic mutation plus committed event; replication prerequisites |
| **S03.8a** | Actual native lifecycle/identity/index integrity and bounded metric ownership/readback |
| **S03.8b** | Production-world workload/monitoring gate using frozen profile/budgets, not the storage spike |
| S04.1 / S04.3 | Stable template/asset GUID revisions; instance provenance and explicit override/propagation policy |
| S04.5 | Actual durable identity/reference/provenance roundtrip/restart contract and evidence |
| **S07.18a** | Evennia-reference client projection/lifecycle replication contract, identity/baseline/delta/visibility/recovery; close impacted ADR-008 decisions |
| **S07.18b** | Actual scoped lifecycle/status/location baseline/delta service, bounded queues and stale-ID handling |
| **S07.18c** | Actual multi-client visibility/lifecycle/churn and reconnect/resync evidence |
| S10.3 | Timed native spawning/despawning from versioned Blueprints, atomic caps and persistence policy |
| S17.10 | Real bounded host-facing telemetry from the existing owners, no duplicate metric/world manager |

These are planned gates, not passes. [S03.8 plan](../05-sprints/specs/S03-8-SPEC.md) and [S07.18 plan](../05-sprints/specs/S07-18-SPEC.md) make the missing work explicit. Each slice receives its exact read set, approved interfaces, budgets/oracles and commands before one scoped Builder/independent Auditor. This owner clarification adds no tests, benchmarks or source scope to the current codec slice. S02.10 remains mandatory before S03 closes.
