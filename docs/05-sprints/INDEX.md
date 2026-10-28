# Sprint Index — Dependency-Ordered Recovery Roadmap

**Status:** PROPOSED plan, NOT a declaration of implementation. **Owner:** lead architect. Last reviewed: 2026-10-28.
Agent kickoff reads [SPRINT-TRACKING](../SPRINT-TRACKING.md) and the exact sprint spec, not every TDD. [CLAUDE.md](../../CLAUDE.md) assigns Lead/Builder/Auditor; author individual specs from [template](specs/SPRINT-SPEC-TEMPLATE.md), and log rationale in [SPRINT-HISTORY](../SPRINT-HISTORY.md).

All sprints are *complete owned vertical/architectural capabilities* with real test proof. Do not use "MVP" as permission to deliver stubs. Parallel work is permitted only when owner contracts and prerequisites are stable.

## Critical dependency chain
00 Documentation baseline -> 01 ADR/design freeze -> 02 ECS core -> 03 Schema/persistence -> 04 Spatial/exit graph -> 05 Commands/events/clock -> 07 Transit -> 09 Map editor -> 10 Blueprint authoring -> 11 Graph/script runtime -> 12 Visual world systems -> 13 Hosting -> 14 Release verification.
Parallel gates: 05 -> 06 World systems; 05 + 03 -> 08 Network/auth; 08 + 04 -> 09 Editor shell. 06 feeds 07, 11 and 12. 08 feeds 13.

| Sprint | Scope | Required predecessors | Exit proof |
|---|---|---|---|
| S00 | Source audit, indexes, product contracts | None | Baseline evidence + index links |
| S01 | ADRs, architecture/API/interface freeze, test harness plan | S00 | Reviewed decisions, no OPEN blocker for S02 |
| S02 | Real ECS identity, registry, schemas hooks, queries, writes, scheduling interfaces | S01 | ECS behavior/invariant tests + benchmarks |
| S03 | Project assets, schema versions, blueprint core, persistent world snapshots/migrations | S02 | Save/restore/migration fixtures |
| S04 | Spatial/containment, room/exits, locks, region/location topology | S03 | Nested containment and traversal tests |
| S05 | Central commands, actor/session model, typed events, observer narration contract, world clock, scheduler | S04 | Deterministic commands and audience event projection |
| S06 | World behaviors: weather, spawning, triggers and region scope | S05 | Durable scheduled regional systems |
| S06Q | ECS quest engine, conditions, phase/instance authority, persistent quest progress | S03–S05 | Bob/Joe engine-level quest/visibility/reward invariants |
| S07 | Vehicles, tracks, docking, moving interiors, dynamic exits | S04–S06 | Train scenarios T-01..T-10 at engine level |
| S08 | Gateway protocol, sessions, authorization, multi-client runtime, phase-filtered observer events | S03, S05, S06Q for quest-aware projection | Two-client/auth/reconnect + visibility/narration tests |
| S09 | Cross-device editor shell and cell-grid/map interaction | S04, S08 | Touch/keyboard and map roundtrip |
| S10 | Component/Blueprint visual editor and reusable asset authoring | S03, S09 | New custom blueprint from UI + versioned instance |
| S11 | Typed graph compiler/executor, approved scripting bridge and custom typed events | S05, S06, S10, S06Q for quest nodes | Behavior equivalence, sandbox and custom event tests |
| S12 | Visual authoring for world systems, spawners, weather, transit, observer rules | S06, S07, S09–S11 | No-code authoring of integrated world |
| S12Q | Full quest-chain/dialogue/conditional-content visual authoring | S06Q, S08–S11 | Bob/Joe built without code; real 2-player/phase tests |
| S13 | One-click and headless hosting, deployment, ops, backup/rollback | S03, S08, S11–S12, S12Q | GUI/CLI parity and crash restore incl. quests |
| S14 | Full cross-platform, accessibility, security, performance and release audit | S02–S13 | Named measurable release thresholds |

## Sprint gating rules
- Start only when predecessor exit evidence exists or lead documents a safe parallel contract, with its regression coverage.
- Tests run in CI/local environment with actual integration, not mocked behavior that proves only the mock. Claims of completion require stdout/test reports and a changed-behavior demonstration.
- A sprint must not silently break higher-level invariants from earlier sprints; its regression suite includes relevant upstream scenarios.
- An unresolved ADR relevant to the sprint is a STOP, not a license for agent guessing.
- Independent auditor may veto on correctness, architecture, integration, security, performance or documentation drift.
- Quest requirements have additional dependency gates in [quest implementation plan](quest-implementation-dependencies.md); owner approval of phase/instance/reward/party semantics is required before S06Q.
- The [token/dispatch policy](../06-quality/token-and-dispatch-policy.md) governs scoped runs, Builder prohibition on full suites, optional Auditor-only final suite, and delta-only re-audits.
- Each sprint's complete acceptance cases and evidence live in [sprint specifications](sprint-specifications.md), with cross-feature oracle [train scenario](../04-features/train-reference-scenario.md).

## Maintenance
The lead records status as Planned / In Progress / Blocked / In Review / Verified; never use "Done" without objective verification. Link PR, commit SHA, test commands/results, benchmarks and audit findings. Avoid speculative sprint dates.
