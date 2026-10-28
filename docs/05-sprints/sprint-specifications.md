# Sprint Specifications, Deliverables and Acceptance

**Status:** PLAN / NOT IMPLEMENTED. Current small checkable sprint phases and their actual deliverables: [phase tracker](phases/INDEX.md). Each of 74 phases gets one Builder, one scoped independent Auditor, user-testable evidence, and a checked box only after verified PASS. Read [dependencies](INDEX.md), [agent policy](../06-quality/agent-policy.md), [test matrix](../06-quality/test-matrix.md). Do not treat any stage as implemented because its requirements are written.

## S00 — Documentation and baseline
**Deliver:** accurate repo inventory; read-only audit of surviving Spring starter and historic deletion; synced source-controlled docs/index; product stories and open decisions; no restored discarded code.
**Accept:** links resolve, version/status clear, no document asserts an unimplemented feature works, owner confirms goals.

## S01 — Architecture and technology decisions
**Deliver:** approved ADRs for ECS representation, C++ vs managed engine comparison with measured criteria, threading/single-writer design, component/schema storage, persistence, pinned C#14/.NET10 compiler and worker protocol implementation validation, sandbox, memory ownership, Tauri/web/tablet packaging, protocol and hosting targets. Interface diagrams, data schemas, security evaluation and performance budgets.
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

## S06Q — Complete Quest Runtime, Objectives, Conditions, Phasing, Instances and Rewards
**Deliver:** versioned ECS quest definitions and attempts; shared condition/eligibility registry; objective catalog with provenance, kill/escort/level and custom event credit; prerequisite/branch graphs; eight-stage dialogue dispatch; guaranteed, choice and chance reward resolution/claim; per-observer phase visibility and targetability; true private encounter instance ownership; persistence, audit and error diagnostics.
**Accept:** [Quest Verification Matrix](../04-features/quests/08-quest-verification-matrix.md) engine cases plus [Bob/Joe](../04-features/bob-joe-quest-scenario.md). No claim of network UX until S08, and no claim of complete visual quest creation until S12Q. All reward/phase/chain ADRs must be approved.

## S07 — Moving objects, trains and dynamic exits
**Deliver:** track graph, routing, motion/docking state, interiors as stable locations, dynamic platform and door bindings, transferable players/NPCs/items, persistence of route progress.
**Accept:** actual runtime tests T-01–T-10; locked departure/boarding race; script/trigger processing during transit; no per-passenger coordinate rewriting and no static exit corruption.

## S08 — Multi-client protocol
**Deliver:** auth/session ownership, protocol envelopes, versioning and authorized event projections, reconnect/resume behavior, channel backpressure and structured network failure handling.
**Accept:** two real network clients, denied cross-world/unauthorized requests, no duplicate mutation on reconnect, correct filtering and bounded queues under load.

## S09 — Editor shell, centralized ThemeManager, graph-paper canvas and map

**Authority:** [ThemeManager](../03-contracts/editor-theme-manager.md) and [six checkable phases](phases/S09.md).

**Deliverable phases:** S09.1 centralized typed semantic theme tokens and dark default; S09.2 creator-editable, import/export, preview/cancel and persisted **user themes**; S09.3 shared subtle dark graph-paper minor/major square **lines**, no dots, stable pan/zoom/snap; S09.4 cross-device editor shell and input manager; S09.5 usable saved/undoable room map, regions and exits; S09.6 real creator visual walkthrough and responsive performance/accessibility evidence. All fonts, colors, spacing, node styles and canvas grid appearance must resolve from **one** ThemeManager, not from independent feature docs/components.

**Accept:** each phase has real user-checkable demonstration, focused test, one Builder, one scoped Auditor PASS. Actual theme import/restart and graph-paper rendering are verified before S11 reuses the view.

## S10 — Complete component/Blueprint authoring UI
**Deliver:** custom schema forms, reusable graph/composition, template library/search, typed editor, child slots, instance overrides, asset dependency view, compile/preview validation.
**Accept:** train Blueprint with cars/doors created through visual UI; no raw code/JSON for required workflow; migration/version impact visible; reopen preserves assets.

## S11 — Complete graph behavior and script integration

**Architecture decisions FIXED:** Standard C# 14/.NET 10/Roslyn, versioned Protobuf, host-local published scripts, isolated worker, authoritative native ECS mutations, typed Graph IR/HookDecision/GameEffect, persistent registered field overrides and no required hot reload. See [v1 contract](../03-contracts/scripting-v1/INDEX.md), [actual source/publish/restart](../03-contracts/scripting-v1/09-build-publish-restart-run.md) and [9 individually checkable phases](phases/S11.md). No "if C# chosen" and no alternate language/worker decision.

**Concrete phased deliverables:** S11.1 compile C# SDK and real hooks with Roslyn source diagnostics; S11.2 generate C++/C# Protobuf messages, compile both and roundtrip malformed/valid variants; S11.3 register every hook with exact event/phase/result/owner/capability and real binding validation; S11.4 native ECS hook execution, effect validation/atomic transaction/outbox and per-observer projection; S11.5 protected local worker, resource budgets and failure reporting; S11.6 persistent writable engine-field and state-slot overrides, schema migration and restart; S11.7 typed graph compiler, callable C# nodes, code/graph parity using S09 ThemeManager **graph-paper line canvas**; S11.8 stop → edit/compile → publish immutable host release → start with preflight; S11.9 real two-client Midnight Express, negative tests and performance evidence.

**Accept:** named tests + creator demo + independent scoped Auditor PASS **for each phase**, then full integrated real world/worker result, identical graph/code semantics, no cross-world/stale refs, invalid code fails publish, no forged client code, no fake success narration or duplicate rewards. No claim of completion from static C# source alone.

## S12 — Visual world-system authoring
**Deliver:** system palette, weather editor, NPC/resource spawner region assignments, schedule and caps forms, interactive object trigger editor, transit/route editor, simulation preview and inspections.
**Accept:** complete P-01..P-06 world built visually including train, station, weather, spawners, scripted interaction; no uncategorized manual configuration for standard flows.

## S12Q — Full Visual Quest, Chain, Dialogue and Reward Authoring
**Deliver:** searchable quest library, complete plain-language objective palette, prerequisite/branch graph, eight dialogue tabs, conditional generic/random pools, NPC/exit phasing, solo/party/instance policies, conditional guaranteed/choice/weighted-surprise rewards, typed custom events, graph verification, versioning and multi-actor preview integrated with Map/Blueprint editors.
**Accept:** creator builds every category in [quest UX checklist](../04-features/quests/07-visual-authoring-and-validation.md) including Bob/Joe and [UXQ test matrix](../04-features/quests/08-quest-verification-matrix.md), saves/reopens/hosts and tests real two-player mixed-phase behavior on desktop/tablet. No hardcoded Bob/Joe-only shortcut.

## S13 — Hosting and operations

**Authority:** [six checkable phases](phases/S13.md), [start/restart protocol](../03-contracts/scripting-v1/09-build-publish-restart-run.md), [host-only script model](../03-contracts/scripting-v1/08-local-host-integration.md). Every MudMaker user can create/host their own game and join other users' hosted games; **no player-script uploads**.

**Concrete phased deliverables:** S13.1 GUI/headless real startup/stop of the same immutable release; S13.2 preflight validates published script DLL hashes, exact hook/capability bindings, worker/schema/SDK versions, and rejects bad versions **before** admitting players; S13.3 real persistence and restart recovery for ECS, quest, doors/overrides, scheduler, outbox and worker; S13.4 remote player join, host admin/status/logs, port/TLS/health; S13.5 backups, rollback and migration failure handling; S13.6 user-testable one-click/headless hosting walkthrough and platform audit.

**Accept:** every phase has one Builder, one scoped Auditor and creator-tested demo. The server is stopped before script edits/publish, then relaunched; live script patching is not a prerequisite. A fake worker or copy/hash-only demo is not evidence of hosting readiness.

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
