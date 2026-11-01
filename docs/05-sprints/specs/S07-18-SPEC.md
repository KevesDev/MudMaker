# S07.18 — Scoped state and lifecycle replication

**Status:** PLANNED; no interface/transport/source implementation authorized by this outline. [Owner requirements and primary Evennia reference](../../02-architecture/ecs-scale-and-identity-gates.md). Existing actor-filtered Status/Location projections remain required; general ECS lifecycle replication is now explicit. Owner directed Evennia as the behavior reference: server-owned world and session-delivered client updates. Resolve remote ADR-008 details before impacted code; additional distributed-server scope is not assumed.

| Phase | Actual deliverable | Gate |
|---|---|---|
| **S07.18a Contract and codec readiness** | Authenticated world/actor/interest boundary, complete runtime versus template identity, baseline/revision/lifecycle/recovery contract **and actual approved wire-schema/codec compatibility proof** | Review ECS/query/revision/event, persistence, observer/narration and network contracts plus actual prior APIs, using the recorded Evennia behavior baseline. Resolve impacted ADR-008 decisions; record exact interfaces/commands. Contract documents alone cannot pass this phase |
| **S07.18b Replication service** | Real scoped lifecycle/status/location baseline/delta projection over committed native data; no second authoritative world or unrestricted raw component broadcast | a approved/independently verified deliverable; exact bounded implementation spec and filters before dispatch |
| **S07.18c Real clients and recovery** | Actual multi-client visibility, spawning/despawning/reuse and stale/duplicate/out-of-order/gap/backpressure/reconnect evidence at the assigned workload; truthful telemetry and owner app clicks | b PASS; one specified scenario/oracle and commands, not speculative full-network stress. Any cross-server implementation receives its own explicit phases if selected |

Every actual slice uses one Builder then independent scoped Auditor and a passed-phase push. Neither the local S03.4 codec nor architecture documentation verifies these capabilities.
