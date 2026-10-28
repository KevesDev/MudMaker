# Mandatory AI Builder, Investigator and Auditor Policy

**Status:** REQUIRED prohibitions (user) and PROPOSED enforcement workflow. **Applies:** all contributors, including AI agents.

## Roles
**Lead architect:** plans, assigns owners, resolves dependency edges, maintains indexes/ADRs; does not casually bypass decisions by adding code. **Builder:** implements only approved bounded contract. **Independent auditor:** challenges contract conformance, deduplication, tests and measured performance; can reject. **Investigator:** gathers source-backed alternatives for OPEN decisions; does not silently decide product scope.

## Hard rejection criteria
1. Fake tests: empty @Test, assert(true), tests that merely assert mock return, "context loads" counted as feature proof, fake fixtures that bypass production pathway, ignored/skipped tests hidden from report.
2. Placeholder implementation: TODO paths masquerading as functional, hardcoded response pretending to simulate world state, blank no-op, silent catch/ignored error, always-success validation, in-memory mock used in place of required durable behavior.
3. Magic numbers: undocumented numeric thresholds, timeouts, ports, capacities, probabilities, queue lengths or tick intervals. Numerical values must be named constants/config with explicit reason, constraints and tested overrides. Universal mathematical constants and scoped test data are not automatically prohibited.
4. Duplicate ownership: introducing second command registry, parser, map store, event bus, world clock, runtime authority, connection lifecycle or graph execution core without documented ADR and migration plan.
5. Architecture violations: direct UI/script/transport mutations of ECS; shortcuts around authorization; JVM/global static state for per-world data; synchronous dangerous code on world tick; data written directly to storage bypassing game invariants.
6. Unproven portability/security/performance: "works on tablet" based only on build compile; "sandboxed" based only on API naming; "scales to N" without benchmark.
7. Scope deception: labeling an incomplete mechanism "MVP", "temporarily implemented" or "done" without owner-requested scope change.

## Before touching code
1. Read AGENTS.md and relevant docs INDEX entries; identify all overlapping functionality.
2. Read implementation and tests using repository search; map callers, state writers and interfaces.
3. State proposed changes, owner, invariants, integration impact and decisions needed.
4. Confirm prerequisites and that relevant ADRs are approved. If not, investigate/stop rather than guess.
5. Specify acceptance criteria: observable state transition, failure case, persistence/permissions, measured limits where applicable.

## During implementation
- One source of truth for world ECS; no side-channel data stores.
- Commit logical changes with migration and rollback story.
- Prefer named typed contracts and compile-checked/versioned schemas, not opaque strings.
- All errors are surfaced appropriately; no silent catch.
- Tests exercise actual production entry points. Mocks allowed solely at true external boundaries and must not replace the subsystem under test.
- Instrument reproducible performance and failure behavior, not screenshots alone.

## Verification / auditor checklist
- Feature test fails meaningfully when production behavior is intentionally broken (mutation/sabotage test or evidence).
- Negative cases and bad inputs lead to no partial mutation.
- Integration tests cover real cross-module API, not mocked service boundaries.
- Concurrency, transactional and isolation invariants are tested where the feature requires them.
- One owner for every state field; no duplicate function with similar semantics.
- No undocumented change to graph schema, component schema, exit semantics, persisted format or protocol.
- Accurate commit tests/results, OS/platform and benchmark provenance, not fabricated.
- Docs synchronized, requirements fulfilled or explicit blockers, PR can be rejected.

## Completion
Only mark VERIFIED when code, executed tests, runtime demonstration and independent audit agree. A plan or green smoke test alone never qualifies. Relevant red flags block merge; don't lower requirements to clear the sprint.
