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

## S01.4: Wire ABI freeze rules (supports ADR-030)
**Decision:** The worker protocol stays `proto3`, package `mudmaker.scripting.v1`, as in [the existing proto](../../contracts/scripting/v1/mudmaker_scripting_v1.proto). Rules, binding from S13.2:
- Field numbers are never reused or renumbered. A removed field is `reserved` by number and name in the same change.
- Wire changes within v1 are additive only. A breaking change creates `v2` as a new package, with the Lead and owner approving the migration.
- Every envelope carries the protocol version; the worker and engine refuse a different major version at handshake with a structured error.
- IPC is local only: Windows named pipe or Unix domain socket, access-restricted to the supervisor and its worker, length-prefixed frames with a configured maximum size. No network port.
- Generated codecs: C++ and C# from the one proto file, built in S13.2; hook IDs and effect kinds come only from the registry JSON, never invented in code.
- A frozen descriptor-set snapshot is committed with each release and a breaking-change check against it must pass before publish.
- Engine handles crossing the wire are opaque world-and-generation scoped values, revalidated by the engine on every use.
**Why:** locks evolution rules now so S03 to S13 do not drift. Frame size limits and budgets are named configuration set from S13 measurements.

## S01.6: Account identity, credentials and retention
**Decision:**
- `AccountId`, `CharacterId`, `SessionId` and `WorldId` are 128-bit random opaque identifiers from a cryptographically secure source, stored as 16-byte values. They are never sequential, derived from names, or reused. Deleting an account leaves a permanent tombstone so the ID can never be reissued.
- A separate per-world public reference is generated for any player-visible identifier; AccountId is never sent to ordinary clients.
- Passwords are stored only as Argon2id verifiers with a per-account salt. Cost parameters are named configuration calibrated on the host machine at first run and stored with each verifier so they can be raised later. No plaintext or reversible password is ever stored or logged.
- Session tokens are 256-bit random values; only a hash is stored server-side. They rotate on login and privilege change, expire, and are not bearer credentials after a host restart without fresh validation.
- Retention: account deletion erases personal data (name, email, credentials) and keeps the tombstone plus AccountId on immutable audit records. Audit-log retention duration and guest expiry are host-configurable named settings with no engine default hidden in code. Backups follow the host's retention choice and the restore path must re-apply tombstones.
- Authorization stays capability-based as in the [account contract](../03-contracts/account-character-lifecycle.md); owner and root protections cannot be overridden by scripts.
**Why:** matches the contract's lifecycle and threat boundary; Argon2id is the current recommended password-hashing algorithm, to be verified by test in S07.7.

## S01.8: Optional local inference runtime
**Decision:** The optional NPC model runs in **llama.cpp** (MIT licensed) built as a bundled native library, in a **separate supervised worker process** with its own CPU thread and memory ceilings, one shared loaded model per host, bounded request queue and a kill switch. CPU-only operation is the baseline and the feature is off unless a verified model pack is installed. Models are GGUF files from the fixed catalog in [S02](../05-sprints/specs/S02.md); no external server, Python, Docker or cloud service. Speed and quality thresholds are named configuration derived from S07.19 measurements on a 2-core and a 4-core CPU-only machine with 8 GB RAM; if a host's measured latency exceeds the creator's response budget, replies fall back to authored lines or silence. Redistribution licensing is checked per exact model artifact when the catalog is built (S02.10), not assumed from the runtime license.
**Why:** matches [the NPC contract](../03-contracts/optional-local-npc-dialogue.md); process isolation keeps inference from stalling the single-writer simulation.
**Open until measured:** acceptance numbers for latency and roleplay fidelity (S07.19, S18.13, S18.14).

## Versioning
SemVer. Pre-release `0.x` until S18. The repo-root `VERSION` file is the single source; `app/package.json`, `app/src-tauri/Cargo.toml`, `app/src-tauri/tauri.conf.json` and the engine CMake project must equal it. A check script fails the build on drift.

## Branch policy
`master` stays at the last audited state. Each completed phase group is committed by the Lead to the **`working`** branch on `origin` after Auditor PASS.

## Not decided here (remain OPEN, gated by their sprint)
ADR-006..027 not listed above are unchanged. ADR-008 (S07), ADR-010 (S05/S12), ADR-011 (S06/S10), ADR-014 (S04/S09), ADR-015, ADR-017 to ADR-027 (S10, S11, S13, S16) block only their named sprints and are resolved just before that sprint's spec. ADR-012 budgets are set from S01.5 measurements; release performance claims stay blocked until then. S01.4, S01.6 and S01.8 are recorded above.
