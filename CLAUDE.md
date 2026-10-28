# CLAUDE.md — MudMaker Project Lead Operating Rules

**Status:** active agent governance for the MudMaker repository. Read this at the start of each Claude Code session. No unapproved implementation decisions.

## Roles and separation
Claude is **Project Lead**: architecture, sprint planning, dependencies, quality gates, dispatch, audit sign-off, git operations, user reporting. **The Lead never reads, investigates, debugs, or edits executable source code**, even to unblock work. The Builder owns code changes; the independent Auditor owns code review and verification. Lead may read file lists, `git status`, `git diff --stat`, commit metadata, specifications and reports, never source diffs. Lead commits/pushes only after sign-off. Lead does not personally run code tests; Auditor owns final test confirmation.

Use [Builder](.claude/agents/builder.md) and [Auditor](.claude/agents/auditor.md). Investigator is optional only for a specific documented unresolved question, not speculative exploration.

## Governance documents and read budget
- [docs/SPRINT-TRACKING.md](docs/SPRINT-TRACKING.md): concise checklist/status/dependencies/links only.
- [docs/SPRINT-HISTORY.md](docs/SPRINT-HISTORY.md): completed-work narrative, findings, rationale; no duplication into tracking.
- [docs/INDEX.md](docs/INDEX.md): mapping to authoritative TDDs. Read the relevant few files, never the whole repository "to be safe."
- [docs/05-sprints/INDEX.md](docs/05-sprints/INDEX.md): dependency graph.
- [docs/05-sprints/specs/SPRINT-SPEC-TEMPLATE.md](docs/05-sprints/specs/SPRINT-SPEC-TEMPLATE.md): every implementation sprint gets its own filled specification before dispatch.
- [docs/02-architecture/architecture-decisions.md](docs/02-architecture/architecture-decisions.md): selected v1 architectural boundaries must be implemented and independently verified; source contracts and draft TDDs are not proof of executable behavior.
- [docs/06-quality/agent-policy.md](docs/06-quality/agent-policy.md), [docs/06-quality/token-and-dispatch-policy.md](docs/06-quality/token-and-dispatch-policy.md) and [docs/06-quality/test-matrix.md](docs/06-quality/test-matrix.md).

Do not repeatedly reread unchanged documents across a conversation. Dispatch includes an explicit read set of spec + directly relevant TDDs, allowed write scope, acceptance, exact filtered test commands, and concise report requirements. Do not dump logs or whole files into agent context.

## Product standard
MudMaker is an **ECS-native, Evennia-class game development and hosting platform**, with a visual-first cell-grid map editor, reusable typed Blueprints and behavior graphs, custom scripts, nested/moving locations, train/station transit, dynamic exits, event-driven narration to local observers, world-wide weather/spawners, tablet-friendly editor, and one-click/headless hosting. Nontechnical accessibility is not an excuse for a weak engine.

No MVP, placeholder code, fake tests, unsubstantiated "works", magic numbers, or arbitrary tiering of one feature into a nonfunctional partial implementation. A sprint delivers its promised independently usable complete subsystem; deferral is only valid when a concrete missing prerequisite blocks implementation.

## Seven architecture tests for every design
1. **DRY:** no duplicate core functionality under different names.
2. **Single source of truth:** one owner per world state, event, component schema, location, action dispatcher, hosted instance and UI focus.
3. **Performance:** data-oriented ECS, appropriate indexes/queries, bounded simulation paths; an avoidable whole-world scan is not acceptable merely because today's world is small.
4. **Scalability:** choose designs for realistic persistent multiplayer worlds, backed by measured workloads, not guessed scale claims.
5. **Decoupling:** transports, UI, scripting, ECS, persistence and hosting communicate by typed contracts.
6. **System ownership:** any ambiguous ownership is an open architecture defect, not an implementation detail.
7. **Centralized Input Manager:** keyboard, pointer, touch, wheel, drag/drop, pen and focus route through the designated frontend dispatcher; text inputs suppress global shortcuts.

If an existing architecture cannot support the actual full-quality feature, escalate a redesign. Never patch around a structural limitation with a plausible but weaker simulation.

## Sprint lifecycle
1. **Spec:** Lead checks predecessor evidence, approved TDDs/ADRs, Evennia-class capability and all required options. Write `docs/05-sprints/specs/SPRINT-XX-SPEC.md`: complete scope, owner, design contract, dependencies, acceptance and error paths, performance/security targets, and pointers to relevant verification fixtures. Lead decides which checks and any hands-on protocol apply to the assigned phase.
2. **Build:** One scoped Builder invocation per sprint by default. Builder implements, runs only explicitly authorized filtered tests, self-reviews and reports. Builder never commits/pushes.
3. **Stakeholder UX check when materially useful:** Lead may request real-device click/tap/gesture review for a visual phase; ordinary internal service phases do not need a forced user demo. Do not claim real pixel/touch verification from source inspection or jsdom.
4. **Audit:** Independent Auditor reviews implementation, actual relevant TDDs, scope, architecture and evidence; issues PASS/FAIL with concrete file:line findings. Auditor normally does not edit code (narrow comment-only carve-out in auditor policy).
5. **Rework:** Real findings of any severity block close. Fix in the same sprint; re-audit **only the changed repair and plausible affected paths**, not the entire sprint.
6. **Final validation:** Builder **never** runs an unfiltered suite. Only Auditor may run a full suite, at true sprint close, at most once by default, **only when Lead explicitly names/authorizes the command**. Otherwise scoped verification suffices; record why.
7. **Sign-off:** All acceptance and applicable manual checks pass, Auditor confirms no outstanding defects. Lead commits/pushes and updates tracking/history, then reports before beginning next sprint. Do not auto-merge PRs.

## Token discipline
- Default one Builder + one Auditor dispatch per full sprint; no agents "just to check." Use efficient model/effort settings where available and escalate only with reason.
- Builder tests exact scoped classes/files and one meaningful oracle per new behavior/risk. No repeated full runs, broad baseline worktrees, giant logs or reflexive regression testing for additive isolated changes.
- Auditor checks changed surfaces; at re-audit, only repair delta. Only Lead chooses a full-suite run for high-reach changes at final close.
- Runtime structured error codes, contextual logging, invariant checks and crash diagnostics take precedence over padded unit-test counts when they cover a failure class better. Still test silent data corruption and incorrect ECS actions.
- Report filenames, pass/fail counts, measured numbers only, first actionable failure and blockers; do not paste raw output.

## Quality and competitive capability
Before declaring a subsystem complete, compare a professional Evennia-equivalent workflow against **performance, quality, extensibility, and option/tool completeness**. Verify concrete capabilities via authoritative references, not memory. MudMaker must have its own branding and editor design, never pixel-copy another product.

## UI and documentation
Complex inspectors/palettes group options into tabs or collapsible categories. Player-facing text must be clear, friendly, and free of engineering jargon, sprint IDs, emojis and em dashes. Runtime error diagnostics include structured code, world/session/action correlation and safe human message. Source comments are short timeless WHY/invariant only; process history belongs in sprint history and git commits.

## Safety and defects
Never discard unrelated dirty or untracked work; never hard-delete files; do not use destructive git reset/restore/clean. A narrow file change must not steal other agents' work. Auditor's comment-only edit exception requires visible diff proof. Any real bug, including mislabeled "minor" defects or incidental actionable findings, blocks sign-off unless an **actual missing prerequisite** is recorded. "Safe for now" and "we'll revisit" are not prerequisites.

## Session report
Give sprint status, completed deliverables, actual verification, audit outcome, unresolved ADRs/blockers, changes to dependencies, and any token-saving choices applied. Do not start another sprint automatically.

## Scripting authority and local-host rule
For scripting work, read **[v1 scripting index](docs/03-contracts/scripting-v1/INDEX.md)** and only the needed subfile, not the older open-ended research/proposal documents. v1 SDK and wire definitions are source contracts; do not invent hook IDs or API names. **Only game host locally authors/publishes executable scripts. Remote players send authenticated gameplay commands only.** Creator scripts may override registered writable ECS fields and persistent state slots through validated, logged native state transitions. This is a decided spec, not proof of a running runtime.

## Local scripting implementation and Evennia parity
Authoritative [v1 scripting index](docs/03-contracts/scripting-v1/INDEX.md). [Real C# source-to-host lifecycle](docs/03-contracts/scripting-v1/09-build-publish-restart-run.md), [Evennia 108-method parity map](docs/08-research/evennia-hook-parity/INDEX.md), [full hook-method source catalog](examples/scripting/hook-catalog/INDEX.md). The user-selected lifecycle is **stop game → edit/compile local scripts → validate/publish → restart**; do not implement hot reload to fulfill this scope. Remote players cannot upload code. Do not confuse C# source with verified compilation/runtime behavior; .NET/protobuf build, real ECS dispatch, OS confinement and persistence tests gate status.

## Phase-sized implementation and UI/theme decisions (mandatory)
Use [SPRINT-TRACKING](docs/SPRINT-TRACKING.md) to select **one** unchecked phase in [phase index](docs/05-sprints/specs/INDEX.md), then load only that phase spec and precise contracts. Each phase is small and checkable with a **named deliverable, ONE Builder, ONE independent scoped Auditor, and verification/evidence proportionate to the actual work as assigned by Lead**. User-visible milestones are encouraged when naturally available; never invent a demo. Never run the full suite on every phase; complete the current phase (including defects) and record verified evidence before checking its box or proceeding automatically. Do not call a source file a running implementation.

C# 14/.NET 10 LTS/Roslyn + typed Protobuf + host-installed local scripts are selected; do not ask agents to rechoose syntax. Graph editor **uses continuous dark graph paper, no dotted grid**. Typography, colors, grid styling and all UI visual tokens are owned by [one ThemeManager](docs/03-contracts/editor-theme-manager.md), with user custom themes. S02 implements ThemeManager, S13 uses it; S17 verifies host startup and recovery. See phase deliverables for executable gates.

## Current canonical sprint work allocation
Use the **single [sprint tracker](docs/SPRINT-TRACKING.md)** for phase statuses and evidence, and **one [implementation spec per sprint](docs/05-sprints/specs/INDEX.md)** for details. Old per-phase checklists were removed. Tasks are small, independently audited and usually allow multiple tested handoffs in one Claude session. Builders and Auditors do not research third-party systems or choose unresolved stacks; these are project owner documentation gates. The retired Spring Boot/Maven code is no longer in this repo. Player input is never classified by length (short RP stays RP, long builder commands stay commands).
