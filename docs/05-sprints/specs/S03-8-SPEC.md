# S03.8 — Native lifecycle, metrics and production scale gate

**Status:** PLANNED; no source implementation or test/benchmark command authorized. [Binding owner requirements and traceability](../../02-architecture/ecs-scale-and-identity-gates.md). Depends on passed S03.5/6/7 and actual native World, not the benchmark spike. Parent S03.8 passes only after a/b independent acceptance.

| Phase | Actual deliverable | Pre-dispatch gate |
|---|---|---|
| **S03.8a Lifecycle and metric ownership** | Production creation/destruction/reuse/index/reference integrity and bounded, truthful native counters/readback; no per-entity polling/thread or shadow store | Review existing identity/World/query/version/event APIs and ECS/test-matrix contracts. Name exact metric owner, collection cost, lifecycle oracles and filtered commands |
| **S03.8b Production workload and monitoring** | Production ECS evidence for hundreds/thousands of composed entities, sustained spawn/despawn/reuse, sparse/archetype changes, queries, multi-world isolation, memory and latency; record real metrics/failures | Requires a PASS; review S01.5 results and ADR-012, freeze named populations/composition/churn profiles, hardware/build and acceptance budgets before one bounded workload command. No arbitrary scale promises or extra stress hunts |

Before either dispatch, Lead writes its bounded implementation spec and exact commands. No global/full suite or benchmark runs now. Independent audit precedes pass/push; record runtime evidence and limitations. This phase does not complete template persistence, remote replication or timed spawner policies owned by S04/S07/S10.
