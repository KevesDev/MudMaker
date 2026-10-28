# MudMaker — Mandatory AI Agent Contract

For Claude Code sessions, start with [CLAUDE.md](CLAUDE.md) and the assigned role file. Otherwise start with [docs/INDEX.md](docs/INDEX.md), then read **only** the authoritative documents listed for the task. Read [docs/07-decisions/OPEN_DECISIONS.md](docs/07-decisions/OPEN_DECISIONS.md) before proposing new interfaces or technologies. Read [docs/06-quality/agent-policy.md](docs/06-quality/agent-policy.md) for all implementation work.

## Status model
- **REQUIRED**: confirmed product behavior from the project owner. Never delete or dilute.
- **PROPOSED**: detailed design offered for owner review. Do not treat it as an approved implementation decision.
- **OPEN**: unresolved; stop the impacted implementation and request a decision or create an ADR.
- **IMPLEMENTED / VERIFIED**: only when matching source, executed tests and evidence exist.
Documentation specifications do **not** imply implemented features.

## Rules
1. No source code implementation until the affected requirements, owner, API contracts, and dependency gates are identified.
2. The ECS world model is mandatory, not optional or replaceable with conventional OOP entities.
3. A unique authoritative runtime mutation path is mandatory: no direct mutation from UI, network, script, graph evaluator, or persistence adapters.
4. Do not build duplicate managers, parallel command paths, or alternate versions of an existing function. Search code + docs and report ownership conflicts first.
5. No placeholders, stubs posing as complete features, magic numbers, fake tests, assertion-free acceptance tests, or silent MVP scope cuts.
6. Do not claim security, performance, scalability, portable packaging or tablet hosting without demonstrated evidence.
7. Use acceptance tests, negative cases, and execution evidence; independent review precedes approval.
8. Maintain docs/INDEX.md, affected contracts, ADRs, and sprint status with meaningful changes. Keep [SPRINT-TRACKING](docs/SPRINT-TRACKING.md) brief, reasons in [SPRINT-HISTORY](docs/SPRINT-HISTORY.md), and follow [token/dispatch discipline](docs/06-quality/token-and-dispatch-policy.md).
9. Do not modify the existing Google Doc as a substitute for source-controlled specs; Markdown in this repository is the technical source of truth.

## Agent reading recipes
- ECS/storage -> system-boundaries, ecs-core, state-persistence, test-matrix.
- Train/moving rooms/exits -> ecs-core, spatial-containment-transit, commands-and-input, test-matrix.
- Blueprints/scripts -> scripting-and-graph, blueprint-editor, time-events-world-systems, security-policy.
- Observer narration -> narration-and-observers, spatial-containment-transit, protocol-and-hosting.
- Quests, Joe/Bob, visibility, private instancing -> quest-progression-and-phasing, quest-conditions-and-dialogue, bob-joe-quest-scenario, quest-and-dialogue-editor.
- Map editor -> map-editor, spatial-containment-transit, ux-platform, commands-and-input.
- Hosting -> hosting-and-admin, protocol-and-hosting, state-persistence, security-policy.
- Sprint work -> sprint INDEX, sprint-specifications, agent-policy, affected contract.

Use the strict Lead -> Builder -> Auditor gate; Builder never runs unfiltered test suites. Only Auditor may do so at full sprint close on an explicit Lead-named command. Human UX review can precede costly audit when visual feel is the main uncertainty. Fix real findings in the same sprint; re-audit only repair scope.

Provide a review summary with every proposed change: owner, contract impact, tests performed, commands/results, risks, and unresolved decisions. **No feature may be labeled done by documentation alone.**
