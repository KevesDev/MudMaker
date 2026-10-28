# Architecture Boundaries and Single Ownership

**Status:** PROPOSED contracts; ECS centrality is REQUIRED. **Owner:** architecture. **Dependencies:** vision and open decisions.

## Logical components
- **Editor / Player UI:** React-based cross-device view proposed. UI owns ephemeral presentation, gestures, keyboard focus, selection and optimistic state only when reconciled. UI never mutates authoritative ECS state directly.
- **Application gateway:** authentication, session identity, rate limits, protocol versioning, authorization checks; REST for project/admin operations and WebSocket for live events are PROPOSED, not locked technologies.
- **Headless ECS engine:** deterministic entity/component lifecycle, queries, system scheduler, commands, events, world rules and game-local state. No dependency on Tauri, browser DOM or UI components.
- **Script/graph execution adapters:** execute validated logic via capability-limited commands/queries exposed by the engine. Both use the same authorization and mutation bridge.
- **Persistence adapter:** snapshots, incremental changes/transactions, schema migrations, project assets and restore. Does not independently decide game rules.
- **Hosting supervisor:** manages processes/instances, health, deployment versions, crash policy, logs and backups. Does not become a second world engine.
- **Optional packaging:** desktop Tauri or other shell may wrap web UI and start local engine where OS permits; not a mobile server assumption.

## Ownership table
| Concern | Sole authoritative owner | Must not own |
|---|---|---|
| Physical UI inputs, focus | Frontend Input Manager | Game command parsing or server permission |
| Command grammar/dispatch | Command subsystem | UI widgets, transport handlers |
| Identity and permissions | Session/Auth service | Raw socket address identity |
| World mutation | ECS transaction/command executor | Scripts, graph evaluators, REST handlers |
| Entity identity/composition | ECS registry / component storage | ORM entity objects serving as live state |
| Time and system ordering | World scheduler | Ad-hoc timers in scripts/UI |
| Containment/location/visibility | Spatial subsystem built on ECS | Handcoded position rules per entity type |
| Exits, boarding and travel | Navigation/Transit systems | UI-only exit definitions |
| Durable save/restore | Persistence service | Per-feature local files without schema |
| Events | Typed event dispatcher | Unbounded listener side effects |
| Script capabilities | Scripting gateway | Direct raw Java/DB/filesystem access |
| World publishing | Hosting supervisor | Editor pretending local save = deploy |

## Inbound mutation path
UI gesture / text command / graph / script / admin API -> command request (subject, actor, world, expected version, intent) -> authenticate + authorize + validate preconditions -> enqueue or execute inside world-owned transaction -> ECS state transition -> typed events -> persistence publication + client events. Reject with structured errors; no partial mutation on failed validation.

## Concurrency and lifecycle
- A world instance must have a well-defined mutation concurrency model. *Proposed*: single-writer deterministic simulation loop with concurrent reads/snapshot publication and work queues; alternative must be evaluated via ADR before implementation.
- No unbounded blocking I/O, database calls or user scripts on hot world-update path.
- Cross-world interactions require explicit contract; no accidental shared mutable global ECS.
- Engine code is independently testable without launching Spring/Tauri/editor.
- Separate project *definitions* from running *instance state* and editor draft state; never let admin editing race live players without versioned deploy semantics.

## Architectural violations
Reject: duplicate CommandParser in UI and server; direct DB writes for gameplay; script-modified component collections outside mutation gateway; direct UI pointers as entity identity; entity-type hardcoded switch in navigation; unmanaged background threads; using project JSON as runtime store; mixing map grid coordinates with authoritative spatial containment.

## Decision gates
Runtime language/framework, ECS storage layout, concurrency scheduler, serialization and DB, protocol and script sandbox require reviewed ADRs before implementing impacted code.
