# S01.5-SPEC — Native ECS storage benchmark

**Status:** APPROVED, IN PROGRESS
**Owner:** Engine architecture (evidence for ADR-002 and ADR-012)
**Approved TDDs:** [ADR-RECORDS-S01](../../07-decisions/ADR-RECORDS-S01.md) (ADR-001, 002, 003); [ecs-core.md](../../02-architecture/ecs-core.md) (identity, queries, mutations, tests 1, 2, 4, 7)
**ADRs:** 001, 002, 003 decided; benchmark may amend 002. ADR-012 budgets are derived from this phase, not assumed.
**Predecessors:** S01.1 to S01.3 DONE, S01.7 DONE.
**Phase tracker:** [S01.5](../../SPRINT-TRACKING.md#s01)
**Assigned Builder:** one, sonnet high. **Auditor:** one independent, sonnet high.
**Implementer write scope:** `engine/spikes/ecs-storage/**` only (new). No edits to `app/`, `docs/`, root files.
**Out of scope:** the production ECS (S03), persistence, networking, scripting, descriptor-driven creator schemas beyond a runtime-sized column proof, multithreaded systems.

## Objective
Produce measured numbers so ADR-002 (hybrid archetype plus sparse-set, generational IDs) and the ADR-012 workload budgets rest on evidence. The spike code is disposable measurement code; the production engine in S03 is written fresh and does not import it.

## Deliverables
1. CMake 3.25+ C++20 project in `engine/spikes/ecs-storage/`, no third-party dependencies (own timing harness using `std::chrono::steady_clock`, own check macro). Builds with MSVC (VS 2026 present, use `vswhere`/Developer prompt as needed). Targets: `ecs_spike_tests`, `ecs_spike_bench`.
2. Two storage paths behind the same minimal test interface: (A) chunked structure-of-arrays archetype storage; (B) sparse-set per component type. Both use `EntityId` is a struct of three `uint32_t` fields: `world`, `index`, `generation`. A slot whose generation would overflow is retired, never reused. Component layouts are descriptor-driven: at least one component type is registered at runtime with a size and alignment and used through the same path as built-in ones.
3. Correctness tests (`ecs_spike_tests`), exact expected values stated in test names: stale handle after destroy is rejected; handle from world 1 is rejected by world 2 with the same index and generation; generation retirement at `UINT32_MAX`; add/remove component moves entity between archetypes with data preserved; query returns exactly the entities having all required and none of the excluded components; runtime-registered component round-trips bytes.
4. Benchmarks (`ecs_spike_bench`), each on both paths, at 10,000, 100,000 and 1,000,000 entities: bulk create; destroy and recreate churn (50% of entities); iterate a two-component query and write one field; iterate a three-component query with one excluded; add/remove a tag component on 10% of entities per step; random access by handle; per-mutation latency p50/p99/max from individual timed operations (batched timing is not acceptable for latency); bytes per entity (measured by allocator counter or computed from capacities, state which). 7 timed repetitions after 2 warmups, report median, min, max.
5. Results written by the benchmark to `engine/spikes/ecs-storage/results/results-<date>.json` and `.md` table, including CPU model, logical cores, RAM, OS, compiler version, exact flags, git commit.
6. An AddressSanitizer build of `ecs_spike_tests` (MSVC `/fsanitize=address`) run once with zero reports. State plainly if UBSan is unavailable on this toolchain; do not claim it ran.
7. A `README.md` inside the spike directory with build and run commands only.

## Acceptance criteria
- AC-01 All correctness tests pass in Release and in the ASan build.
- AC-02 Benchmarks run to completion in Release (/O2, no debug iterator checks), results files produced, no sample counts reduced.
- AC-03 Measurement validity: results of every timed loop feed a sink that the compiler cannot discard; setup and teardown are outside timed regions; dataset is built identically for both paths with a fixed seed.
- AC-04 Reported numbers are copied from the results file, never typed by hand; any claim of A versus B is backed by those numbers.
- AC-05 Builder report states which path wins each workload and by how much, flags any measurement that looks suspicious (very low variance, impossible speed), and makes no recommendation beyond the data.

## Verification cost plan
**Builder verification:** configure and build Release and ASan once; run `ecs_spike_tests` (both builds) and `ecs_spike_bench` once. No other runs; the benchmark's internal repetitions are the only repeats.
**Auditor scope:** correctness and measurement validity (AC-03), no dead-code elimination, identical datasets, latency timed per operation, accuracy of Builder's reported numbers against the results file, spec compliance. Auditor may re-run `ecs_spike_tests` once and the 100,000 entity benchmark subset only if the bench exposes a filter; otherwise reads the results file.
**Full suite:** NOT REQUESTED. **Regression surface:** NONE (new directory).
**Test oracle:** expected values stated in the spec's correctness list, independent of the implementation.
**Evidence budget:** counts, the table, first actionable error.

## Stakeholder hands-on protocol
NOT APPLICABLE (no UI). Lead summarizes the table for the owner and records ADR amendments.

## Risks
MSVC ASan runtime DLLs not on PATH: Builder locates them via the VS install and reports. Timer resolution on Windows: use per-operation timing only for latency tests with a documented overhead subtraction measured by timing an empty operation.
