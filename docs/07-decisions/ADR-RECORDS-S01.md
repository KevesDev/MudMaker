# Decision Records — Platform, Engine and Persistence

**Approved:** 2026-10-28 by project owner (engine language, database chosen explicitly; UI shell delegated to Lead with criteria quality, performance, scalability). Records the settled choice only. Implementation proof is separate and gated by [SPRINT-TRACKING](../SPRINT-TRACKING.md).

## ADR-001 / ADR-028: Engine language and scripting boundary
**Decision:** Authoritative headless engine in **C++20**, built with CMake and MSVC (Windows), Clang/GCC elsewhere, dependencies pinned through vcpkg manifest mode. Engine has no dependency on Tauri, browser or UI. Scripts do **not** transpile to C++; C# 14/.NET 10 runs in the separate host-local worker already decided in [scripting v1](../03-contracts/scripting-v1/01-decisions-and-evidence.md).
**Why:** every existing contract (handles, Protobuf IPC, S13.2 codecs) assumes native engine; deterministic memory layout is required for data-oriented ECS.
**Risk gates:** AddressSanitizer/UBSan builds in CI-equivalent local script; S01.5 benchmark must pass before S03 begins.

## ADR-002: ECS storage and identity
**Decision:** Hybrid. Chunked structure-of-arrays **archetype** storage for components that co-occur; **sparse-set** storage for tag and high-churn components. `EntityId` = world id + 32-bit index + 32-bit generation; a generation is never reused while any reference may exist. Component layouts are descriptor-driven (runtime-registered, frozen per world release) so creator-defined schemas use the same path as built-ins.
**Why:** archetypes give cache-linear query iteration; sparse sets avoid archetype thrash for transient state; descriptor layouts satisfy typed creator components without a second storage engine.
**Gate:** the S01.5 benchmark compares the two storage paths on named workloads and may amend this record with measured evidence.

## ADR-003: Writer model and ordering
**Decision:** One authoritative **single-writer** simulation loop per world. All mutation enters one command/transaction gateway. Readers (projection, persistence, network) consume immutable epoch snapshots or committed event batches. Phase order is fixed: validate intent, simulate, scheduled behaviors, effects/events, commit, publish. Systems declare read/write sets, enforced by the scheduler. No system owns a thread. Budgets come from named configuration, not literals.
**Why:** deterministic replay and the test-matrix requirement; avoids lock-order defects.

## ADR-004: Persistence
**Decision:** **SQLite in WAL mode**, bundled in the application (no service, Docker or external runtime). One project database file plus content-addressed asset directory. Writer thread owns the connection; commits include the domain-event outbox in the same transaction. FTS5 backs Data Manager search. Backups use the SQLite online backup API with manifest and checksum. Migrations are versioned and run only by the application with a pre-migration checkpoint.
**Why:** crash-safe, single-file, portable, scalable to large indexed record sets; satisfies the embedded-storage requirement in [local database contract](../03-contracts/local-database-and-data-manager.md).

## ADR-005: Platform and editor shell
**Decision:** **Tauri 2** shell (Rust, thin) hosting a **React + TypeScript + Vite** frontend; one codebase for Create, Play and Host workspaces, with desktop (Windows, macOS, Linux) first and Tauri mobile targets for tablet clients later. The engine and script worker run as separate sidecar processes started by the shell; the shell holds no game state. The canvas editor renders with GPU-accelerated 2D (WebGL/WebGPU through a single canvas layer chosen in S02.6). All input routes through the single frontend Input Manager.
**Alternatives rejected:** Electron (larger footprint, no tablet target), browser-only (no native window or one-click hosting).
**Launch command:** `npm run tauri dev` from `app/` (see S01.7).

## S01.5 measured outcome (2026-10-28)
Evidence: [spike results](../../engine/spikes/ecs-storage/results/results-2026-10-29.md), [spec](../05-sprints/specs/S01-5-SPEC.md). Single machine (i9-14900K, pinned P-core, MSVC Release); numbers are a floor for S03, not release budgets.
**ADR-002 confirmed, with two binding refinements:**
- Components read together by hot multi-component queries live in archetype storage. After churn, archetype iteration was 2.3x to 11.4x faster than sparse (2-term and 3-term at 1M entities, fragmented world), and archetype iteration barely degrades with fragmentation.
- Sparse-set storage is for tags and components toggled at high rates: tag add/remove was 3.6x to 5.9x faster than archetype in steady state. Sparse components must not appear in hot multi-component queries. Sparse destroy was slower (p50 89 ns vs 34 ns at 100k).
**ADR-012:** engine regression rule for S03 is that each matching S03 workload must not be slower than the spike's on the same hardware, with the workload definitions in the spike. Device matrix, accessibility target and release budgets stay OPEN and require measurement on supported devices.
**Limits of this evidence:** one machine, one thread, 9 to 17 archetypes, UBSan unavailable on this MSVC toolchain (ASan ran on tests only). Latency rows flagged in the results are reported as measured.

## Versioning
SemVer. Pre-release `0.x` until S18. The repo-root `VERSION` file is the single source; `app/package.json`, `app/src-tauri/Cargo.toml`, `app/src-tauri/tauri.conf.json` and the engine CMake project must equal it. A check script fails the build on drift.

## Branch policy
`master` stays at the last audited state. Each completed phase group is committed by the Lead to the **`working`** branch on `origin` after Auditor PASS.

## Not decided here (remain OPEN, gated by their sprint)
ADR-006..027 not listed above are unchanged. ADR-008 (S07), ADR-010 (S05/S12), ADR-011 (S06/S10), ADR-014 (S04/S09), ADR-015, ADR-017 to ADR-027 (S10, S11, S13, S16) block only their named sprints and are resolved just before that sprint's spec. ADR-012 budgets are set from S01.5 measurements; release performance claims stay blocked until then. S01.6 (account identity) and S01.8 (inference runtime) records are written before S04.14 and S07.19.
