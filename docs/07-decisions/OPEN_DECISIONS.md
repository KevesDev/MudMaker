# Open Architecture Decisions — No Agent Guessing

**Status:** v1 scripting decisions approved as design contracts by project owner instruction to settle scripting proposals, recorded at [v1 decisions](../03-contracts/scripting-v1/01-decisions-and-evidence.md). Non-scripting architecture decisions still OPEN until their separate approval. Decided contracts are not proof of implemented or tested behavior. The old v1.1 document supplies historical proposals, **not automatically locked decisions**.

| ID | Question / constraint | Current status and blocking scope |
|---|---|---|
| ADR-001 | Headless engine selection: C++ ECS (preferred candidate under research) vs managed engine/legacy Java; portable packaging, runtime threading/memory safety, engine independent of UI framework | OPEN: blocks S03 implementation stack |
| ADR-002 | ECS internal storage (archetype/sparse-set/hybrid), component value model, entity ID generation, dynamic schema layout | OPEN: blocks S03 |
| ADR-003 | World writer concurrency, system phases, deterministic ordering and transaction semantics | OPEN: blocks S03 |
| ADR-004 | Project asset format, world persistence database (SQLite/H2/other), snapshot/event log, schema migration | OPEN: blocks S04 |
| ADR-005 | Editor/platform architecture: browser-first/PWA + optional Tauri vs alternative; offline editing/hosting and tablet support matrix | OPEN: blocks UI packaging S02 |
| ADR-006 | Creator scripting language and worker interface | **DECIDED v1:** standard C# 14 / .NET 10, local host-published only, separate bounded worker, Protobuf IPC. [Source](../03-contracts/scripting-v1/01-decisions-and-evidence.md). OS profiles pending verification, not selection. |
| ADR-007 | Graph semantics and integration | **DECIDED v1:** typed graph plan, identical HookDecision/GameEffect API to code. Compiler internals/performance remain implementation evidence gate. [Graph contract](../03-contracts/scripting-v1/06-graph-parity-and-publishing.md). |
| ADR-008 | Runtime wire protocol, legacy MUD adapters, reconnection semantics, auth provider | OPEN: blocks S07 |
| ADR-009 | MudMaker game hosting model | **DECIDED:** every user may create/host games and play games hosted by others; only game host's locally authored/published scripts execute. GUI/headless host parity required; transport/NAT/TLS details still OPEN. [Host contract](../03-contracts/scripting-v1/08-local-host-integration.md). |
| ADR-010 | Spatial parent semantics for nested rooms, route progress interpolation, dynamic exit binding/capacity policy | PROPOSED spec requires confirmation before S05/S12 |
| ADR-011 | World time: real-time vs turn-based coexistence, pause/catch-up, persistent timers, event delivery guarantee | OPEN: blocks S06/S10 |
| ADR-012 | Quantitative workload and resource budgets, OS/test devices and accessibility conformance target | OPEN: blocks performance/release claims |
| ADR-013 | Editing/deploying script releases | **DECIDED:** stop → edit/compile → validate/publish → restart; no hot reload required. Persistent migration/rollback must be verified before S17. |
| ADR-014 | Blueprint inheritance/child templates, component schema permissions and custom type UI | OPEN: blocks S04/S09 details |
| ADR-015 | Default product game template/command set, onboarding, traditional telnet/SSH clients | OPEN: design and release documentation |
| ADR-016 | Host isolation and script fault containment | **DECIDED boundary:** locally host-authored scripts only; no incoming player code/script uploads. Separate bounded worker; exact OS profile/benchmarks OPEN. [Host security](../03-contracts/scripting-v1/05-wire-security-recovery.md). |

| ADR-017 | Event narration template precedence, audience snapshot timing, idempotent message delivery, visibility/hidden identities | OPEN: blocks observer delivery implementation |
| ADR-018 | Quest state scopes and lifecycle / objective attribution; prerequisite and reward atomicity; repeat policies | OPEN: blocks S11 |
| ADR-019 | Phasing vs private instance rules, observer filtering, cache invalidation, group sync/replay, private instance ownership/persistence | OPEN: blocks S11/S07 |
| ADR-020 | Quest dialogue session semantics, branch precedence, condition schema and post-completion visibility | OPEN: blocks S11/S16 |

| ADR-021 | Quest objective provenance and milestone semantics: preaccept items, kill credit, escort recovery, level change | OPEN: S11 |
| ADR-022 | Chain prerequisites, mutually exclusive choices, branch replay and recurrence/reset windows | OPEN: S11 / S16 |
| ADR-023 | Eight-stage dialogue precedence, random pools, concurrent sessions, interruption/turn-in | OPEN: S11 / S16 |
| ADR-024 | Guaranteed/choice/random rewards, rarity weights, class/level gating, reveal/claim and overflow policy | OPEN: S11 / S16 |

| ADR-025 | Creator Hook Registry v1 | **DECIDED v1:** exact hook IDs, typed events and phase rules in [registry](../03-contracts/scripting-v1/03-hook-registry.md); additional hooks require typed schema and catalog update. Engine integration/test pending. |
| ADR-026 | Durable custom world event lifecycle; start/stop atomic vs async outbox, rollback and restart; script/graph workflow session handling | OPEN: S10/S11/S13 |
| ADR-027 | Character name predicate source/normalization/visibility, quiz answer secrecy/retry/idempotency, script resource/capability limits | OPEN: S11/S13/S16 |

| ADR-028 | Unity/Godot model vs MudMaker: reject assumption all scripts transpile to C++; choose native C++ ECS, library, scripting ABI by benchmarked ADR | OPEN: S01/S03/S13 |
| ADR-029 | Script language and special symbols | **DECIDED v1:** standard C# 14 syntax, no special MudMaker remapping of @, #, or braces; typed editor references. [SDK](../03-contracts/scripting-v1/02-code-sdk.md). |
| ADR-030 | Native engine ↔ worker references/ABI | **DECIDED v1:** world/gen-scoped opaque handles, typed Protobuf IPC, no native pointers and server revalidation; operational OS hardening/tests pending. [Wire/security](../03-contracts/scripting-v1/05-wire-security-recovery.md). |
| ADR-031 | Script fields, scopes, persistence and override authority | **DECIDED v1:** typed registered writable engine fields and persistent/transient state slots, 3-layer precedence, guarded migrations; integration/persistence backend tests pending. [Fields/state](../03-contracts/scripting-v1/04-references-and-state.md). |

## Confirmed non-negotiables
ECS-native engine; nontrivial systems like moving trains with interiors and dynamic exits; visually created ECS blueprints/graphs and optional custom scripts; user-defined global/region weather/spawner/trigger systems; interactive cell map with color/icons, searchable pallet, room contents and exit editing including descriptions/locks; quest chains with conditional NPC visibility/interactivity, branching dialogue, solo/party/instance workflows and robust progression; action-dependent room/vehicle observer messages; nontechnical one-click hosting plus headless CLI; professional rather than mock implementations; deliberate performance, maintainability and multi-OS/tablet support.

## Decision process
For each ADR: describe problem, constraints, alternatives, security/performance/UX tradeoffs, source-backed research or measurement, recommended choice, owner approval, dependencies, rollback/migration and specific tests. Update row to APPROVED only after decision record lands. A developer/agent may suggest a default but may not turn it into silent implementation.

## Reconciliation with historical v1.1
v1.1 specified Java 21/Spring, GraalPy, Tauri/React, JSON+SQLite/JPA, Python hot-reload and annotation node bridge. C++ ECS + code C# worker + typed visual graph is the currently preferred **research direction**; not an approved stack or permission to implement without measured decision. The current source is a minimal Spring/H2 bootstrap, while earlier Java Swing/MySQL code was intentionally removed. This document **preserves original concepts** (ECS, two scripting modes, local/cloud runtime, map and playable terminal) without automatically adopting outdated or unvalidated technology choices.

## Confirmed Scripting Deployment & Hook API (current)
- **No live hot-reload requirement:** Game host stops the server, edits/compiles locally, publishes validated scripts, then starts server from pinned release; [source-level lifecycle](../03-contracts/scripting-v1/09-build-publish-restart-run.md). ADR-013 live migration/hot reload only applies if later explicitly requested; startup migrations and rollback remain mandatory.
- **Evennia comparison:** 108 upstream overridable methods/hooks from seven main modules are mapped to 89 distinct MudMaker hook IDs; all are in v1 source-level catalog, plus MudMaker-specific hooks (121 total). [Map](../08-research/evennia-hook-parity/INDEX.md) and [registry](../contracts/scripting/v1/hooks.v1.json). **None is proven dispatched by the native engine.**
- **Account login hooks:** Game creator hooks execute only **after the engine's identity provider authenticates credentials**, before world/session attach. No script receives password/token or can override authentication. Invalid logins yield only safe, nonsecret reason codes to optional post-failure hooks.
