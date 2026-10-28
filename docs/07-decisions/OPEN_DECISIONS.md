# Open Architecture Decisions — No Agent Guessing

**Status:** OPEN unless expressly approved by user and recorded as ADR with rationale, alternatives, compatibility impact and tests. The old v1.1 document supplies historical proposals, **not automatically locked decisions**.

| ID | Question / constraint | Current status and blocking scope |
|---|---|---|
| ADR-001 | Backend language/framework and headless packaging: Java/Spring candidate vs alternatives; engine independent of web framework | OPEN: blocks S02 implementation stack |
| ADR-002 | ECS internal storage (archetype/sparse-set/hybrid), component value model, entity ID generation, dynamic schema layout | OPEN: blocks S02 |
| ADR-003 | World writer concurrency, system phases, deterministic ordering and transaction semantics | OPEN: blocks S02 |
| ADR-004 | Project asset format, world persistence database (SQLite/H2/other), snapshot/event log, schema migration | OPEN: blocks S03 |
| ADR-005 | Editor/platform architecture: browser-first/PWA + optional Tauri vs alternative; offline editing/hosting and tablet support matrix | OPEN: blocks UI packaging S09 |
| ADR-006 | Scripting language(s), VM, in-process vs isolated worker and safety limits; GraalPy is historic proposal | OPEN: blocks S11 |
| ADR-007 | Graph intermediate representation, type system, flow execution, code generation vs interpreter, budget model | OPEN: blocks S11 |
| ADR-008 | Runtime wire protocol, legacy MUD adapters, reconnection semantics, auth provider | OPEN: blocks S08 |
| ADR-009 | Hosting targets: local-only, self-hosted remote and/or managed platform; NAT/TLS/discovery, CLI shape and process supervisor | OPEN: blocks S13 |
| ADR-010 | Spatial parent semantics for nested rooms, route progress interpolation, dynamic exit binding/capacity policy | PROPOSED spec requires confirmation before S04/S07 |
| ADR-011 | World time: real-time vs turn-based coexistence, pause/catch-up, persistent timers, event delivery guarantee | OPEN: blocks S05/S06 |
| ADR-012 | Quantitative workload and resource budgets, OS/test devices and accessibility conformance target | OPEN: blocks performance/release claims |
| ADR-013 | Editing/deploying live state: release pin, migration/rollback and collaborative edits | OPEN: blocks live authoring S12/S13 |
| ADR-014 | Blueprint inheritance/child templates, component schema permissions and custom type UI | OPEN: blocks S03/S10 details |
| ADR-015 | Default product game template/command set, onboarding, traditional telnet/SSH clients | OPEN: design and release documentation |
| ADR-016 | Multi-world tenant/resource isolation, threat model for untrusted creator scripts | OPEN: blocks publicly exposed S11/S13 |

| ADR-017 | Event narration template precedence, audience snapshot timing, idempotent message delivery, visibility/hidden identities | OPEN: blocks observer delivery implementation |
| ADR-018 | Quest state scopes and lifecycle / objective attribution; prerequisite and reward atomicity; repeat policies | OPEN: blocks S06Q |
| ADR-019 | Phasing vs private instance rules, observer filtering, cache invalidation, group sync/replay, private instance ownership/persistence | OPEN: blocks S06Q/S08 |
| ADR-020 | Quest dialogue session semantics, branch precedence, condition schema and post-completion visibility | OPEN: blocks S06Q/S12Q |

| ADR-021 | Quest objective provenance and milestone semantics: preaccept items, kill credit, escort recovery, level change | OPEN: S06Q |
| ADR-022 | Chain prerequisites, mutually exclusive choices, branch replay and recurrence/reset windows | OPEN: S06Q / S12Q |
| ADR-023 | Eight-stage dialogue precedence, random pools, concurrent sessions, interruption/turn-in | OPEN: S06Q / S12Q |
| ADR-024 | Guaranteed/choice/random rewards, rarity weights, class/level gating, reveal/claim and overflow policy | OPEN: S06Q / S12Q |

| ADR-025 | Shared quest Hook Registry ABI: stage hooks/modes, handler precedence, validator timing, invocation/effect types and fail-closed policy | OPEN: S06Q/S11/S12Q |
| ADR-026 | Durable custom world event lifecycle; start/stop atomic vs async outbox, rollback and restart; script/graph workflow session handling | OPEN: S06/S06Q/S11 |
| ADR-027 | Character name predicate source/normalization/visibility, quiz answer secrecy/retry/idempotency, script resource/capability limits | OPEN: S06Q/S11/S12Q |

## Confirmed non-negotiables
ECS-native engine; nontrivial systems like moving trains with interiors and dynamic exits; visually created ECS blueprints/graphs and optional custom scripts; user-defined global/region weather/spawner/trigger systems; interactive cell map with color/icons, searchable pallet, room contents and exit editing including descriptions/locks; quest chains with conditional NPC visibility/interactivity, branching dialogue, solo/party/instance workflows and robust progression; action-dependent room/vehicle observer messages; nontechnical one-click hosting plus headless CLI; professional rather than mock implementations; deliberate performance, maintainability and multi-OS/tablet support.

## Decision process
For each ADR: describe problem, constraints, alternatives, security/performance/UX tradeoffs, source-backed research or measurement, recommended choice, owner approval, dependencies, rollback/migration and specific tests. Update row to APPROVED only after decision record lands. A developer/agent may suggest a default but may not turn it into silent implementation.

## Reconciliation with historical v1.1
v1.1 specified Java 21/Spring, GraalPy, Tauri/React, JSON+SQLite/JPA, Python hot-reload and annotation node bridge. The current source is a minimal Spring/H2 bootstrap, while earlier Java Swing/MySQL code was intentionally removed. This document **preserves original concepts** (ECS, two scripting modes, local/cloud runtime, map and playable terminal) without automatically adopting outdated or unvalidated technology choices.
