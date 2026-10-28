# MudMaker v1 Architecture Decisions and Execution Standards

**Status:** canonical design baseline for implementation. This is not a report of completed engine/UI tests. Every selected mechanism below is subject to proof through the owning sprint's build, benchmark, hostile-input and cross-platform tests. Historical ADR IDs remain stable for traceability; no separate open-decisions namespace is needed.

## System ownership and invariants

| Domain | Single authoritative owner | Adapters / prohibited duplicate ownership |
|---|---|---|
| ECS identity, component schemas and world mutation | Native C++ WorldRuntime / serialized WorldWriter | Graph, C# and UI submit typed validated intents; no parallel world writer |
| Physical containment, exits and movement | Spatial/ContainmentService through WorldWriter | NPCs, inventory, transit and UI cannot independently move an entity |
| Commands, aliases, interactions | CommandService | All Player UI, text, telnet, NPC and scripts enter one command authority |
| Visibility, perception and narration | ObserverProjectionService | Transport only delivers observer-approved events, never recomputes secrets |
| Persistence, asset revision and migrations | ProjectStore / WorldStore (SQLite backed) | No per-feature databases, copy-owned quest ledgers or independent file writes |
| Scheduling and world time | WorldClock/Scheduler with durable outbox | No thread/timer per NPC, combat or exit |
| Authentication and access control | Auth/SessionService and native authorization gateway | Script worker/Client cannot issue credentials or grant itself permissions |
| Creator organization, templates, tags and data manager | ProjectAssetService / TemplateLibrary / TagService | Reuse common stable IDs, indexes and editors, not isolated per-asset registries |
| Host process, build/publish/restart and recovery | HostSupervisor / ReleaseService | GUI and headless operator CLI are frontends to same operations |

## Platform and packaging contract

**v1 desktop application and local hosting:** Windows 11 x64 and maintained Linux x86-64 distributions with supported glibc and graphics drivers. **macOS:** target macOS 14+ on Apple Silicon (arm64) for Creator/Player and host where a native C++ and .NET worker build passes the same sandbox/IPC suite; no production-support claim until that target's packaging and security suite passes. **Tablet/web:** current iPadOS Safari, Android Chrome and contemporary desktop Chromium/Firefox/Safari are remote Creator/Player clients via hosted secure endpoints; no in-tablet native host. No application runtime requires Docker, Node, Python, a database daemon or manual SDK installation at end-user deployment. Development/build prerequisites are not end-user dependencies. Native C++ host/worker correctness must be tested separately for each shipping OS; never assume Windows sandbox APIs work on Linux/macOS. Supported targets are a release gate, not evidence of released builds.

**Isolation:** Windows worker restricted token/Job Object/low-privilege profile; Linux unprivileged process with namespaces/seccomp/rlimits where available; macOS sandbox/seatbelt and process resource limits. Each must deny cross-world filesystem/network/process privileges by default and prove timeouts/recovery. The release must not falsely call limits an adversarial-grade sandbox without penetration tests.

**Performance and scalability:** use indexed ECS/tag/search queries, spatial interest management, immutable snapshots for parallel readers, one serialized writer per world, bounded queue budgets and scheduler deadlines rather than threads per actor. Measure 2/4 logical-core CPU, 8GB RAM baseline, template list/search across 100,000 assets, tag lookup across 1M assignments, 500 idle/50 active NPCs and 1,000 scheduled traversals. Reports must include p50/p95/p99 latency, throughput, memory, CPU, restart consistency, platform/build and test dataset; thresholds are specified in owning sprint acceptance and cannot be claimed met from a document.

**Reliability:** commit gameplay/currency/inventory/quest state transactionally or via durable idempotent saga with explicit pending/error. Outbound delivery is at-least-once with deduplication, not magical exactly-once transport. Release manifests pin code, schemas, graph assets and tag/template revisions; failed migrations roll back to a verified restore point. No live hot reload is required.

## Consolidated decisions (stable historical IDs)

### Runtime and storage

| ID | Binding decision |
|---|---|
| ADR-001 | SELECTED v1 architecture: native C++ headless authoritative ECS host with a separate .NET 10 C# worker using Protobuf IPC; no Java/Spring or Unity/Godot required. C++ memory-safety/performance tests remain S01/S03 acceptance evidence. |
| ADR-002 | SELECTED contract: world+generation scoped opaque EntityRef, stable component schema IDs, sparse-set storage for dynamic components with optional archetype/query acceleration; immutable snapshots and indexed queries. Physical layout tuning cannot change ECS semantics or serialized schema. |
| ADR-003 | DECIDED behavioral boundary: one serialized world writer, immutable read snapshots, bounded proposal queues, stable commit order; see ECS core. Internal scheduling performance remains an implementation test. |
| ADR-004 | SELECTED v1 persistence: bundled in-process SQLite with WAL and transaction boundaries, versioned JSON authoring manifests, durable ECS snapshots/event/outbox, staged migrations with verified recovery points and restart-safe version pins; no external DB service. |
| ADR-010 | DECIDED location semantics: one physical parent, separately typed graph exit links, trusted dynamic destination and atomic move/docking transaction; see spatial/containment and ECS exits. |
| ADR-011 | DECIDED clock/recovery: UTC world-clock mapping, pause freezes simulation deadlines, one coalesced recovery per periodic scheduler entry, durable deduped events; see time/events world systems. |
| ADR-014 | DECIDED template inheritance and UI semantics: one parent pin, max 16 ancestry, typed overrides/tombstones, one universal template library with project tags; see reusable templates and variants. |
| ADR-017 | DECIDED observer transport guarantee: host committed event/outbox, at-least-once transport with recipient+event deduplication, viewer-redacted snapshots and idempotent rendering; see narration/observers. |
| ADR-026 | DECIDED: world events are versioned scheduler registrations with onceKeys, durable at-least-once outbox and idempotent native effects; start/stop/update commit through world writer, interrupted workflow resumes or expires under registered policy. See time/events world systems. |
| ADR-031 | typed registered writable engine fields and persistent/transient state slots, 3-layer precedence, guarded migrations; integration/persistence backend tests pending. [Fields/state](../03-contracts/scripting-v1/04-references-and-state.md). |

### Applications, connectivity and hosting

| ID | Binding decision |
|---|---|
| ADR-005 | SELECTED Creator/Player presentation: shared React/TypeScript UI with a Tauri desktop shell and web-compatible remote/tablet view; native headless host independent of UI shell. Offline project editing runs on desktop; tablets edit an authenticated hosted workspace, not a local game engine. |
| ADR-008 | SELECTED: authenticated versioned WebSocket gateway for native clients with typed protobuf-framed game events and commands, TLS required for remote deployment; legacy telnet/GMCP adapters translate to the same native commands. Authentication/session IDs remain host-owned; reconnect reauthenticates, resynchronizes per-observer revision and deduplicates intents. |
| ADR-009 | every user may create/host games and play games hosted by others; only game host's locally authored/published scripts execute. GUI/headless host parity required; transport/NAT/TLS details still pending independent verification. [Host contract](../03-contracts/scripting-v1/08-local-host-integration.md). |
| ADR-012 | SELECTED release acceptance: accessibility target WCAG 2.2 AA on applicable web UI, keyboard/touch parity and screen-reader flows; performance baselines include 2-core/4-core CPU and 8GB RAM, 100k project templates, 1M indexed tag assignments, 500 idle/50 active NPCs and 1,000 pending traversals. These are mandatory measurement targets, not passing benchmark claims. |
| ADR-013 | stop → edit/compile → validate/publish → restart; no hot reload required. Persistent migration/rollback must be verified before S17. |
| ADR-015 | DECIDED: New Project offers Blank World and editable bundled Tutorial World; default command pack is versioned and overrideable. Player supports native connections and third-party telnet/structured MUD adapters. See Tutorial World, commands and external-MUD protocol contracts. |

### Scripting, extensions and security

| ID | Binding decision |
|---|---|
| ADR-006 | standard C# 14 / .NET 10, local host-published only, separate bounded worker, Protobuf IPC. [Source](../03-contracts/scripting-v1/01-decisions-and-evidence.md). OS profiles pending verification, not selection. |
| ADR-007 | typed graph plan, identical HookDecision/GameEffect API to code. Compiler internals/performance remain implementation evidence gate. [Graph contract](../03-contracts/scripting-v1/06-graph-parity-and-publishing.md). |
| ADR-016 | locally host-authored scripts only; no incoming player code/script uploads. Separate bounded worker; exact OS profile/benchmarks pending independent verification. [Host security](../03-contracts/scripting-v1/05-wire-security-recovery.md). |
| ADR-025 | exact hook IDs, typed events and phase rules in [registry](../03-contracts/scripting-v1/03-hook-registry.md); additional hooks require typed schema and catalog update. Engine integration/test pending. |
| ADR-027 | DECIDED: predicate default reads authorized character display name with NFKC normalization and invariant casefold, never account identity. Quiz correct answer remains server-private; retry/expiry/dedup per durable conversation session. Script limits are capability-scoped bounded worker budgets, no raw ECS pointer or cross-world authority. |
| ADR-028 | DECIDED v1 native C++ ECS with typed C# worker/visual graph effects through versioned Protobuf ABI; no script transpilation to C++ and no Unity/Godot engine dependency. Performance and ABI tests remain acceptance, not a new stack-choice gate. |
| ADR-029 | standard C# 14 syntax, no special MudMaker remapping of @, #, or braces; typed editor references. [SDK](../03-contracts/scripting-v1/02-code-sdk.md). |
| ADR-030 | world/gen-scoped opaque handles, typed Protobuf IPC, no native pointers and server revalidation; operational OS hardening/tests pending. [Wire/security](../03-contracts/scripting-v1/05-wire-security-recovery.md). |

### Quests, dialogue and rewards

| ID | Binding decision |
|---|---|
| ADR-018 | DECIDED: quest state versioned by per-character/party/world scope explicitly selected by asset, event-based default credit only after acceptance, deduped committed evidence and atomic final reward. See quest definition/objective/reward contracts. |
| ADR-019 | DECIDED: per-observer phasing filters one shared physical world; private instances are separately identified versioned world/room copies with explicit owner/session scope. Cache invalidates on committed quest/visibility/instance changes; group sync requires explicit policy; no default sharing. |
| ADR-020 | DECIDED: version-pinned per-character dialogue sessions, priority/specificity/stable-ID selection, typed shared conditions, pre/post/completion stages and observer-authorized postquest state; see dialogue stages and quest conditions. |
| ADR-021 | DECIDED: post-accept event-credit by default, no kill sharing/pet credit without explicit policy, state-based objectives recalculate at turn-in, escort and level milestones rely on committed world state; see objective catalog. |
| ADR-022 | DECIDED: prerequisite AND/OR/NOT use fail-closed missing-state policy, stable versioned directed acyclic chains, exclusive choice/replay and authored repeat windows; see chains and dependencies. |
| ADR-023 | DECIDED: eight dialogue stage registry, deterministic priority/specificity/stable-ID selection, isolated concurrent sessions, explicit turn-in and interruption; see dialogue stages. |
| ADR-024 | DECIDED: RewardPlan groups for guaranteed/choice/random; server-owned deterministic RNG, claim-time eligibility default, durable chosen result, no implicit party share, full-inventory stays RewardPending; see rewards and loot. |

## Implementation quality gates

1. **DRY ownership:** each subsystem has one authorizer and source of truth; tests must prove all UI/graph/C#/legacy client routes use it. New system adapters may optimize reads but cannot introduce duplicate mutable state.
2. **No placeholder evidence:** a registered contract, documentation, mock UI, optimistic notification or no-op handler does not pass a sprint. Builders demonstrate real Creator action → native host state → Player observation → restart/restore.
3. **Benchmarked choices:** the selected sparse-set ECS allows optional indexes/archetype acceleration; keep the same entity/schema API and run reproducible benchmarks before optimization. SQLite WAL uses project/world scoped writers and consistent backup API; long-running read transactions are bounded. Abandoning these selections requires an explicit documented compatibility/performance reason, never ad hoc Builder preference.
4. **Cross-platform release:** build and run required automated + manual UX, sandbox, persistence and accessibility tests on every claimed supported OS/browser. A platform may remain unreleased until tests pass; keep source portable and guard OS-specific adapters behind stable interfaces.
5. **Decoupled publishing:** Creator asset editing and tag/search use local ProjectAssetService; HostSupervisor pins/releases immutable manifests; script worker cannot update project organization or raw world storage.
6. **Security:** verify protocol version negotiation, TLS/identity, token scope, hidden entity filtering, hostile input parsing, malformed IPC, worker crash, bounded logs, permissions and resource limits before production claims.

## Authority

The actual owning contracts and source registry are authoritative for DTO layouts, precise hook IDs, UI control IDs and gameplay-specific semantics. This document fixes architectural selections, responsibilities and release standards—not a parallel implementation specification. [System boundaries](system-boundaries.md), [ECS core](ecs-core.md), [state persistence](state-persistence.md), [world clock](time-events-world-systems.md), [scripting contracts](../03-contracts/scripting-v1/INDEX.md), [universal templates](../03-contracts/reusable-templates-and-variants.md), [tags](../03-contracts/universal-tags-and-organization.md), and [sprint tracker](../SPRINT-TRACKING.md) contain scoped implementation obligations.
