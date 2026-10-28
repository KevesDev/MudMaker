# Agent Token, Verification and Dispatch Budget Policy

**Status:** proposed policy adapted from provided AnimLab CLAUDE.md / builder.md / auditor.md. **Authority:** `CLAUDE.md` is role governance; this file is the cost-controlled execution contract.

## Cost model
Expensive work is unnecessary recontextualization, speculative agents, full-suite reruns, repeated comprehensive audits, giant tool logs and tests that don't distinguish correct from incorrect behavior. Savings must not come from skipping real verification of ECS, identity, session authorization or world-data correctness.

## Role boundaries
Lead: **never touches executable code**, does specs, dependencies, project history, git stage/commit/push after sign-off. Builder: one scoped implementation against approved spec; targeted tests only, no commit. Auditor: independent read-only substantive review, only final full suite when explicitly authorized. Investigator: precise research task tied to OPEN ADR. Don't spin up agents merely to repeat what existing docs already establish.

## Minimum context packets
A Builder/Auditor dispatch includes (1) role, (2) exact sprint spec path, (3) 1–4 relevant TDD paths from docs/INDEX, (4) affected code paths/module owners, (5) what is explicitly forbidden/OPEN, (6) precise targeted command with filter once test tooling is selected, (7) acceptance oracle(s), (8) short report format. The agent searches code narrowly and escalates if missing context; it does not preload the entire repository.

Example design scope: an exit narration change reads `docs/03-contracts/narration-and-observers.md`, `docs/02-architecture/spatial-containment-transit.md`, and the relevant sprint spec, not weather/spawners or all hosting documentation.

## Execution limits
- Default exactly one Builder and one Auditor for each completed sprint. Rework is prompted by concrete findings and kept scoped.
- Builder runs **only filtered tests** specified by Lead; never project-wide/full suite, including its own final pass.
- Auditor runs scoped tests by default; at **actual full sprint close** may run one named full suite on explicit Lead request. No repeated full suite on re-audit.
- Run a regression test only if change touches a pre-existing shared path or identifies an actual regression risk. Purely additive isolated data types/panels do not trigger suite-wide regression.
- Timing-sensitive tests may be repeated once to verify; no tenfold flake hunts. No routine worktree baseline comparisons or serial execution.
- Don't print raw multi-thousand-line test output. Report exact command, pass/fail/skipped count, tested paths, first failure, actual measured benchmarks where applicable. Re-audit only changed fix + real dependencies.
- Local caches/test fixtures may be reused but do not pass off stale runs as current evidence. If test infra absent, report BLOCKED rather than invent successful outputs.

## Behavioral test quality vs test count
A new test must prove a different real branch, invariant or failure mode. For a bug, normally one regression discriminator is enough; duplicate numerical examples asserting the same branch are padding. Independent oracle comes from spec, real fixture or mathematically proven expected output; avoid implementation-sourced truth. Mocks at actual external boundary only, not a fake engine under test. No skipped/empty tests disguised as coverage. Use meaningful measured coverage as supplementary evidence, not as permission to satisfy a percentage through dummy tests.

## Diagnostics before test padding
Build structured domain error codes, request/actor/world correlation, persistent logs, runtime invariant checks, crash recovery and event tracing early. For a failure that reliably throws at a boundary, prefer robust handling + a focused check over numerous nearly identical unit tests. **Silent-wrong-data** (double pickup, wrong passenger room, duplicate departure messages, unauthorised observer leak, corrupted persistence) needs explicit state/event assertions and cannot be outsourced to try/catch or logging.

## Visual/UX handling
For touch/tablet/map/graph behavior, Builder supplies exact manual script, Lead hands to stakeholder, and stakeholder feedback arrives **before Auditor** when presentation/feel is the remaining blocker. Auditor handles structural correctness afterward. No headless-only "visual verified" claims.

## Review and anti-deferral
Every real defect found is a FAIL regardless of nominal severity. Fix without waiting for another sprint unless a named missing prerequisite makes correction impossible; keep exception in tracking with owner, proof and dependency. Small fix -> narrow Builder correction -> targeted Auditor confirmation; do not re-audit whole subsystem automatically.

## Cost reporting
Optionally record per sprint: number of Builder/Auditor/re-audit invocations, scoped/full test runs, failed runs, tokens/cost *only when measurable from provider*, and reason for extra work. Never invent exact token or dollar metrics. Prioritize reducing repeat work and loaded context, not weakening quality.
