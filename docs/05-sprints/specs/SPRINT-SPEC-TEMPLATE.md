# SPRINT-XX-SPEC — <Named Complete Capability>

**Status:** DRAFT / APPROVED / IN PROGRESS / AUDIT / VERIFIED
**Owner:** <one authoritative subsystem>
**Approved TDDs:** <exact authoritative paths and revisions; avoid broad index references>
**ADRs:** <approved IDs; list OPEN blockers>
**Predecessors:** <IDs + exact verified evidence links>
**Phase tracker:** <docs/SPRINT-TRACKING.md#sxx, exact phase ID>
**Assigned Builder:** <one Builder for this phase>
**Assigned Auditor:** <one *different* scoped Auditor for this phase>
**User-testable milestone:** <concrete click/tap/runnable-harness proof>
**Phase checkbox/evidence:** <pending until independent PASS>
**Implementer write scope:** <exact paths/modules>
**Auditor read scope:** <spec, TDDs, relevant changed files>
**Out of scope:** <truly separate dependent capabilities; never deferred parts of this feature>

## Objective / professional workflow
Explain the independently useful, fully functional capability and realistic workload. If it is a creator/editor feature, state the actual nonprogrammer workflow and feature completeness relative to Evennia-class extensibility. No MVP/shallow stand-in.

## Ownership and contracts
State owning subsystem and ECS mutation boundary. Include data types, IDs, query and event contracts, state transitions, versioning, memory/lifecycle limits, persistence and security/permission boundaries. Explicitly forbid any duplicate adjacent owner.

## Deliverables
For each phase, list one independently finishable feature slice, an exact output artifact, one real user-visible demo (or executable test harness before UI exists), the narrowly scoped Builder implementation/tests, and the independent Auditor's negative-path oracle. No giant all-sprint code dump or checkbox promotion from documentation alone.
List exact implemented behavior/API/UI, not just classes or files. Define authoring -> validation -> runtime -> persistence -> recovery behavior where applicable.

## Acceptance criteria (independently testable)
- AC-01 <input -> authoritative mutation -> independently specified expected ECS state and emitted event>
- AC-02 <negative/permission/invalid input -> no partial mutation and useful error>
- AC-03 <persistence/restart or concurrency if feature requires>
- AC-04 <manual interaction/accessibility if user-visible>
- AC-05 <performance target with workload, hardware/environment/metric and agreed budget, when relevant>
Include all necessary custom interaction narration / observers if a feature emits gameplay events.

## Verification cost plan
**Builder exact scoped command(s):** <explicit executable command + test name/filter; never unfiltered>
**Auditor scoped command(s):** <exact filters>
**Potential end-of-sprint full-suite:** <specific command and risk-based justification, or NOT REQUESTED; Auditor only if Lead explicitly approves>
**Regression surface:** <name actual shared callers changed; else NONE>
**Runtime diagnostics:** <structured error codes, trace/counters/invariants, where observable failures need instrumentation>
**Test oracle:** <external expected facts, no implementation-derived tautology>
**Allowed repeat count:** <default 1; timed/flaky max 2 without further approval>
**Evidence budget:** test names/counts and first actionable error, no giant logs.

## Stakeholder hands-on protocol, if UI/visual
Numbered exact click/tap/keyboard actions, setup, expected appearance and behavior; verify on actual target OS/device. Prefer before Auditor to avoid expensive repeated audits on visually bad work. If no UI, write NOT APPLICABLE.

## Risks, escalation and sign-off
Phase policy: **one Builder + one scoped independent Auditor per checkable phase**. User sees small frequent verified milestones; Lead updates that exact phase checkbox/evidence and main 0/N progress only after PASS. Builder must stop on missing ADR/owner/interface or incomplete prerequisite; request spec correction rather than guess. Auditor FAIL blocks every real defect including small ones; remediations stay same sprint. Re-audit repair delta only. Lead commits/pushes after verified PASS and any UX approval, then updates SPRINT-TRACKING and appends one history note.

## Final evidence (fill after build)
Builder report: <path>; Auditor report: <path>; commit/PR: <link>; tests: <counts, commands>; metrics: <actual>; manual UX: <result>; remaining blockers: NONE or explicit.
