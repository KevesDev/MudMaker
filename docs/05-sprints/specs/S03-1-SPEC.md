# S03.1 — Production native ECS identity allocator

**Status:** IMPLEMENTED / independently VERIFIED for identity-library scope, 2026-10-31.
**Owner:** production native ECS identity domain/allocator, consumed by the one world writer. No gameplay entity objects, UI mutation path or duplicate storage manager.
**Predecessors:** S01 ADR-001/002/003, S01.5 measured benchmark, S01.6 WorldId rule. Existing shell accepted; unfinished shell preferences/model setup are not engine prerequisites. Theme I/O is deferred to S18.17 and parked outside runtime source.
**Binding:** ADR-RECORDS-S01.md (including S01.6), ecs-core.md, system-boundaries.md, test-matrix.md identity/isolation rows. Approved C++20/CMake/MSVC, Windows only. Do not re-research stack/libraries or rerun the benchmark spike.

## Contract and decisions

- Production `WorldId` is an opaque 16-byte/128-bit value. One native identity domain issues fresh values using Windows system cryptographic entropy (`BCryptGenRandom`, system library, no new package). No caller-selected world namespace in production allocator construction. Retain all issued namespaces for the domain lifetime, including retired worlds; reject zero/duplicate results and surface entropy failure. No weak/random fallback. Document a named bounded retry policy and reason. Domain state must outlive any issued allocator and may not be copied into an independent authority.
- This is the identity authority later consumed by world lifecycle/writer; do not create a general WorldManager or new gameplay store. Keep domain ownership explicit and world allocators move-only. No process-global mutable game state. There is no restore/restart API in this slice; durable namespace/identity restoration belongs to S04 and is not claimed here.
- `EntityId` carries the complete WorldId plus uint32 index and uint32 generation. Preserve 32-bit index/generation ABI meaning; no truncation to spike's uint32 world tag. `UINT32_MAX` is invalid index, initial generation is zero, free slots reuse deterministically with generation increment. A slot released at maximum generation is permanently retired; never wrap. WorldId need not be stored per slot: a world-bound allocator owns dense slot metadata and a free list, with O(1) normal allocation/release/validation.
- Return typed structured results for invalid/foreign/stale/dead references, entropy/namespace failures and index-capacity exhaustion. Failed validation/release must not alter allocation state. No implicit resurrection or double release. Entity references are values, never raw entity pointers. Expose immutable identity/diagnostic data only, not public generation-forcing or slot-mutation hooks.
- Native identity data remains independent of Tauri, browser, scripts and components. Production paths: engine/include/mudmaker/ecs, engine/src/ecs and a focused engine/tests identity target. Preserve engine/spikes/ecs-storage unchanged as benchmark-only code; reuse the valid allocator mechanics through deliberate extraction/adaptation, not a second production authority.
- Proto/SDK world identities remain Guid/string-compatible opaque 128-bit values. No wire-field changes or codecs in this slice. Future integration uses the existing complete world namespace and separate index/generation; do not invent a new wire protocol.

## Acceptance

AC1: actual C++20 production library creates fresh world allocators and live entity handles; independent world allocators may have identical index/generation yet foreign references are rejected using all 128 world bits.
AC2: create/release/reuse proves stale rejection, deterministic reuse, duplicate-release safety and no mutation on invalid input. Generation-maximum retirement and capacity boundary use the actual production decision/helper, without a public test-only state-forcing API or billions of test iterations.
AC3: cryptographic entropy path fails explicitly, never accepts zero/duplicate namespace results, and domain lifetime/copy rules prevent accidental namespace reset while issued allocators exist. Controlled entropy fixtures are permitted only at the real platform boundary, not mocks of allocator behavior; production default is always system cryptographic entropy.
AC4: one production identity authority, bounded/indexed data paths, no UI/components/queries/authorizations/gameplay/persistence placeholders. No performance/scalability claim or benchmark threshold proof until matching measured workload exists in its assigned phase.
AC5: dedicated Release and ASan identity tests execute, then independent scoped Auditor fully passes. UBSan is unavailable on the current MSVC setup; do not install another toolchain or claim it ran.

## Scope and exact commands

One Builder owns production identity headers/source, engine/CMakeLists.txt, one dedicated assertion-bearing identity test executable and minimal native README. Existing spike files/results remain unchanged. One Auditor reviews only this slice and binding contracts; no extra agent or speculative audit expansion. Lead owns specs/tracker/index/ADR/history/handoff/Git. Preserve parked theme work and unrelated .claude agent rule, deleted LICENSE, untracked settings. LF writes, no commits/push from Builder, no app rebuild or frontend tests.

New target names are authorized: `mudmaker_engine_core`, `mudmaker_identity_tests`; CTest name `ecs_identity_allocator`. CMake minimum 3.25, C++20 and MSVC warnings, no third-party dependencies. `MUDMAKER_ENABLE_ASAN` configures the dedicated target's instrumented build. Register the exact CTest test and prepend the selected compiler's runtime directory to its test PATH for ASan; no ad-hoc shell helper required. Common result/error and entropy abstraction belongs to this focused module, not a speculative generic framework.

From repo root, Builder and Auditor execute only:

```text
cmake -S engine -B engine/build/s03-release -G "Visual Studio 18 2026" -A x64
cmake --build engine/build/s03-release --config Release --target mudmaker_identity_tests
ctest --test-dir engine/build/s03-release -C Release -R "^ecs_identity_allocator$" --output-on-failure
cmake -S engine -B engine/build/s03-asan -G "Visual Studio 18 2026" -A x64 -DMUDMAKER_ENABLE_ASAN=ON
cmake --build engine/build/s03-asan --config Release --target mudmaker_identity_tests
ctest --test-dir engine/build/s03-asan -C Release -R "^ecs_identity_allocator$" --output-on-failure
```

One meaningful assertion per distinct identity risk; no assertion-free accepts or tests that just echo mocked results. No full CTest/spike/benchmark/frontend suite. If a command/toolchain differs from preflight, report it before changing scope. Repair reruns are limited to this same identity target, no new adjacent checks. No extra manual/UI demo is required for this native library phase; S03.4 owns the live shell inspector.

Reports: docs/06-quality/reports/s03-1-builder.md and independent s03-1-audit.md under25 lines. State source ownership, contract impact, exact command/results, concrete errors/decisions and limits. Lead reports actual findings to owner, fixes in-scope findings and re-audits repair only, then commits and pushes GitHub working before S03.2. Do not label a compiled library a running sidecar/world or claim persistence/packaging.

## Executed evidence

[Builder](../../06-quality/reports/s03-1-builder.md); [independent audit PASS](../../06-quality/reports/s03-1-audit.md), zero findings. All six named configure/build/filtered CTest commands passed; Release and ASan each executed the same seven assertion-bearing identity cases. Initial test-build signedness warning fixed with correct uint32 literal, /W4 /WX preserved. Production library and identity test executable exist; spike unchanged. No frontend/extra suites or benchmarks, no UBSan, sidecar/world, persistence or performance claim. Next S03.2 preflight.
