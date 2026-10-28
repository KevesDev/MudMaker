# Mandatory AI Builder, Investigator and Auditor Policy

**Primary operational contract:** [CLAUDE.md](../../CLAUDE.md), [Builder](../../.claude/agents/builder.md), [Auditor](../../.claude/agents/auditor.md), and [token controls](token-and-dispatch-policy.md). This file supplies technical quality gates rather than duplicating complete role prompts.

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

## Quest and observer-specific hard gates
- Quest progress has one ECS owner per declared owner scope; Bob/Joe dialogue, visibility, phase, targetability and rewards use shared typed conditions and authoritative commands.
- Narration derives from committed events and is filtered per observer. A hidden Joe cannot be discovered by guessed ID, room list, conversation broadcast or client event stream.
- Never equate a filtered shared-world NPC with a true private instance; instance IDs, membership and persistence must be explicit.
- No first-class quest capability claim from a hardcoded Bob/Joe handler; the scenario is an integration oracle, not the scope limit.
- Audit test fixture must check per-character quest states and server-side interaction denial, not only visible text.

## Quest quality hard gates
- One QuestProgress authority, one Condition Registry, one Dialogue interpreter and a true private instance owner; never a separate ad hoc quest store per NPC or editor.
- Server-authoritative phase filtering and targetability, including direct ID calls and narration. A hidden Joe cannot leak via API or another player's messages.
- Objective credit semantics and reward grants are independently defined and verified: provenance, combat participation, escort lifecycle, class/level thresholds, rarity/chance and exactly-once claims.
- Complete visual category includes all eight dialogue stages, branching/choice/exclusive chains, phase and party options. Bob/Joe-only implementation cannot pass general quest acceptance.

## Native and code-script quality hard gates
- Treat headless C++ ECS and C# scripts as **research candidates** until approved ADR. Do not mix in Unity IL2CPP as invented runtime compiler or blindly restore Java/GraalPy.
- All script code/graph API uses typed world-scoped handles, component snapshots and proposed ECS commands; no untrusted raw native pointers, shared writable memory, unrestricted reflection/PInvoke or process-wide mutable game state.
- Builder/Auditor must test stale entity refs, cross-world denial, worker termination, memory budget/CPU timeout, hot reload, exposed fields and code-to-graph parity; C++ core requires sanitizer and race/invariant evidence.
- Source scripts never execute on player tablet; GUI/CLI host and remote editor use immutable release+compiler/sandbox protocol.

## Completion
Only mark VERIFIED when code, executed tests, runtime demonstration and independent audit agree. A plan or green smoke test alone never qualifies. Relevant red flags block merge; don't lower requirements to clear the sprint.
