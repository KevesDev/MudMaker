# Sprint Specifications, Deliverables and Acceptance

**Status:** PROPOSED. Read [dependencies](INDEX.md), [agent policy](../06-quality/agent-policy.md), [test matrix](../06-quality/test-matrix.md). Do not treat any stage as implemented because its requirements are written.

## S00 — Documentation and baseline
**Deliver:** accurate repo inventory; read-only audit of surviving Spring starter and historic deletion; synced source-controlled docs/index; product stories and open decisions; no restored discarded code.
**Accept:** links resolve, version/status clear, no document asserts an unimplemented feature works, owner confirms goals.

## S01 — Architecture and technology decisions
**Deliver:** approved ADRs for ECS representation, language/server implementation, single-writer vs alternative, component/schema storage, persistence, script sandbox, packaging/tablet support, protocol and hosting targets. Interface diagrams, data schemas and performance budgets.
**Accept:** no relevant OPEN block for S02; competing technology options evaluated with representative measured prototypes where necessary; explicit interface owners and engine-dependency rules. Do not choose from habit.

## S02 — ECS runtime
**Deliver:** identity and world scoping; registries; dynamic component schema inspection; add/remove/query/patch; system registration, query selection and declared access sets; transactional mutation gateway; metrics/test fixtures.
**Accept:** cross-world isolation, invalid changes rejected atomically, deterministic order, IDs stable, core query semantics validated, reproducible benchmarks and zero placeholder branches.

## S03 — Versions, authoring assets, persistence
**Deliver:** project manifest/asset registry, custom schema fields/version, entity Blueprints and child references, runtime persistence/save/restore, migrations, corruption policy, published snapshot distinction.
**Accept:** nested world roundtrip after real process restart, old-schema migration fixtures, import/export reference validation; no "data saved" claim for in-memory-only mocks.

## S04 — Space, containment, exits and locks
**Deliver:** location ECS schema, acyclic containment, move/transfer, rooms/regions, directed exit graph, static + dynamic destination interface, lock/permission predicates, look/visibility description projection.
**Accept:** carried item, NPC, nested location, exit locks and invalid target cases prove authoritative location invariants. Editor grid remains separate from world topology.

## S05 — Input/commands, events and scheduling
**Deliver:** canonical command registry/grammar, action request/response, world mutation transaction, event envelope/dispatcher, world clock and durable scheduler. Frontend input design contract finalized.
**Accept:** one dispatch owner, duplicate request deduplication, stale state failures, actor permission tests, deterministic event trace and pause/restart of scheduled action. No direct entrypoint bypass.

## S06 — World systems and interactive behaviors
**Deliver:** region-scoped weather controller, spawner definition, capacity and placement policy, typed event triggers and configurable object interactions. Extend via components/registered capabilities rather than hardcoding special cases.
**Accept:** deterministic weather/spawn lifecycle, capacity enforcement under concurrency, safe reload and restart, missing-room no-op with typed status and trace. All systems use same clock/command gateway.

## S06Q — Quest Progression, Shared Conditions, Phasing and Private Instances
**Deliver:** ECS-based durable quest attempt state, event-driven objectives, branching/rewards, conditions reused by NPC visibility/interaction, phase-aware world projection and explicit private encounter instancing.
**Accept:** [Bob/Joe Q-01..Q-19](../04-features/bob-joe-quest-scenario.md) engine semantics, invalid-ID/permission checks, observer separation and restart. Network-specific two-client tests complete in S08, visual in S12Q; do not mislabel S06Q as the completed quest authoring feature.

## S07 — Moving objects, trains and dynamic exits
**Deliver:** track graph, routing, motion/docking state, interiors as stable locations, dynamic platform and door bindings, transferable players/NPCs/items, persistence of route progress.
**Accept:** actual runtime tests T-01–T-10; locked departure/boarding race; script/trigger processing during transit; no per-passenger coordinate rewriting and no static exit corruption.

## S08 — Multi-client protocol
**Deliver:** auth/session ownership, protocol envelopes, versioning and authorized event projections, reconnect/resume behavior, channel backpressure and structured network failure handling.
**Accept:** two real network clients, denied cross-world/unauthorized requests, no duplicate mutation on reconnect, correct filtering and bounded queues under load.

## S09 — Usable cross-device world map editor
**Deliver:** responsive shell, centralized physical Input Manager, grid rendering/layout and icons/colors, cell inspector, searchable entity palette, room create/remove, exit/lock editor, region painting, touch navigation, undo/redo, validated drafts.
**Accept:** user can produce connected rooms and nested train interior maps using UI only; test on desktop and tablet viewport/touch; full project roundtrip and invalid-state dialogs.

## S10 — Complete component/Blueprint authoring UI
**Deliver:** custom schema forms, reusable graph/composition, template library/search, typed editor, child slots, instance overrides, asset dependency view, compile/preview validation.
**Accept:** train Blueprint with cars/doors created through visual UI; no raw code/JSON for required workflow; migration/version impact visible; reopen preserves assets.

## S11 — Complete graph behavior and script integration
**Deliver:** graph validation, typed ports, event/flow/action/query nodes, interpreter or compiled IR per ADR, debug trace, script gateway/sandbox with audited limits, hot reload with rollback.
**Accept:** graph and script equivalent permission checks and world effects, loop timeout safe, deterministic replays, invalid types blocked at publish, live version pinned. Scripting language is not preselected.

## S12 — Visual world-system authoring
**Deliver:** system palette, weather editor, NPC/resource spawner region assignments, schedule and caps forms, interactive object trigger editor, transit/route editor, simulation preview and inspections.
**Accept:** complete P-01..P-06 world built visually including train, station, weather, spawners, scripted interaction; no uncategorized manual configuration for standard flows.

## S12Q — Visual Quest, Dialogue and Phase Authoring
**Deliver:** searchable quest/chain library, full typed branches/objectives, conditional dialogue with random generic pools, NPC visibility/interaction conditions, configurable after-completion options, group/instance decisions, version validation and state/observer preview.
**Accept:** creator builds Talk to Bob -> Find Joe entirely through visual UI, plus branching/repeat/group cases; [Q-20..Q-22](../04-features/bob-joe-quest-scenario.md), desktop/tablet hands-on evidence, real multiplayer conditional NPC behavior and no independent quest-engine duplicate.

## S13 — Hosting and operations
**Deliver:** same versioned world artifact loaded by GUI and headless CLI; preflight, logging, diagnostics, health, join details, session administration, consistent backup/restore and rollback, graceful stop.
**Accept:** real process/service launches on supported targets, real remote joining per advertised scope, restart/restore tests T-09/T-12; failure/rollback tests with bad schema, port and script.

## S14 — Release qualification
**Deliver:** platform matrix, performance report, threat model verification, load and endurance tests, accessibility review, documentation consistency checks, recovery drills and audited release candidate.
**Accept:** no unapproved critical findings; predetermined benchmarks meet agreed thresholds, complete train fixture passes across targets; no unresolved release-blocking ADR.

## Per-sprint evidence template
- Change/commit/PR reference; scope/spec version; owner; affected interfaces. Author exact sprint doc from [template](specs/SPRINT-SPEC-TEMPLATE.md).
- Positive, negative and concurrency scenarios with actual initial input and expected outputs.
- Commands executed and concise summaries of pass/fail counts; no wall-of-logs. Builder runs targeted tests ONLY; Auditor runs a full suite ONLY at full sprint close and when Lead explicitly names it. Re-audit fixes with changed-delta scope. Regression is situational. Integration evidence and benchmark hardware/environment when relevant.
- Architecture auditor findings, corrected regressions, known limitations explicitly NOT labeled complete.
- Revised docs and next sprint dependency impacts.

If a requested feature cannot be implemented to its stated contract, mark the sprint BLOCKED and explain missing decision/dependency; do not declare a half-functioning feature verified.
