# MudMaker Technical Documentation Index

**Version:** architecture reset draft, 2026-10-28. **Authority:** this repository. **Implementation:** mostly not started. **Required** = owner-confirmed goal; **Proposed** = specification requiring review; **Open** = decision gate. Start here; open only relevant pages.

| Need | Authority | Status |
|---|---|---|
| What are we building and why? | [Vision + scenarios](01-product/vision-and-scenarios.md) | REQUIRED |
| Desktop, tablet, nontechnical editor workflows | [UX + platforms](01-product/ux-and-platform.md) | REQUIRED goals; PROPOSED interaction contract |
| Module boundaries and ownership | [System boundaries](02-architecture/system-boundaries.md) | PROPOSED |
| Entity/component/system/query semantics | [ECS core](02-architecture/ecs-core.md) | REQUIRED architecture; PROPOSED contract |
| Rooms, containers, moving trains, exits, spatial graph | [Spatial / containment / transit](02-architecture/spatial-containment-transit.md) | REQUIRED scenario; PROPOSED invariants |
| Weather, spawners, events, time and scheduling | [Time / events / world systems](02-architecture/time-events-world-systems.md) | REQUIRED features; PROPOSED mechanics |
| Durable state, prototypes, versions, save/restore | [State / persistence](02-architecture/state-persistence.md) | PROPOSED |
| Keyboard/touch/text input and game command pipeline | [Commands + input](03-contracts/commands-and-input.md) | REQUIRED ownership; PROPOSED contract |
| Nodes, custom scripts, execution and APIs | [Scripting + graph](03-contracts/scripting-and-graph.md) | REQUIRED capability; PROPOSED interfaces |
| Remote protocol, sessions, hosting runtime | [Protocol + hosting](03-contracts/protocol-and-hosting.md) | PROPOSED |
| Clickable color/icon cells; room panel; exits | [Map editor](04-features/map-editor.md) | REQUIRED behavior; PROPOSED interaction detail |
| ECS object/Blueprint graphs and inspectors | [Blueprint editor](04-features/blueprint-editor.md) | REQUIRED behavior; PROPOSED graph semantics |
| One-click / CLI launch and operations | [Hosting + admin](04-features/hosting-and-admin.md) | REQUIRED behavior; PROPOSED operations |
| Cross-feature train example and end-to-end oracle | [Train station reference scenario](04-features/train-reference-scenario.md) | REQUIRED story; PROPOSED exact cases |
| Dependency graph and sprint gate list | [Sprint index](05-sprints/INDEX.md) | PROPOSED |
| Sprint scope, deliverables and acceptance | [Sprint specifications](05-sprints/sprint-specifications.md) | PROPOSED |
| Rules for AI builders/reviewers | [Agent policy](06-quality/agent-policy.md) | REQUIRED prohibitions; PROPOSED enforcement |
| Verifiable behavior matrix and test policy | [Test matrix](06-quality/test-matrix.md) | PROPOSED |
| Trust boundaries, script sandbox, permissions | [Security policy](06-quality/security-policy.md) | PROPOSED |
| Decisions intentionally not guessed | [Open decisions](07-decisions/OPEN_DECISIONS.md) | OPEN |
| Legacy source audit and earlier v1.1 concept | [Baseline](08-research/legacy-baseline.md) | FACTS |

## Cross-document rules
- Requirements and acceptance stories live in product/features; technical state-transition semantics live in architecture/contracts; test oracles live in quality. Link, do not duplicate entire sections.
- When a document proposes a choice, add a decision entry; do not silently promote it to confirmed.
- Each owning subsystem should have one mutation boundary. The map editor, command parser, scripts and network are clients of the same authority.
- Paths are case-sensitive; ensure all links resolve and index entries are updated for added/renamed files.
- The original Google Doc “MudMaker” records the earlier v1.1 design; use these versioned specifications for current planning.
