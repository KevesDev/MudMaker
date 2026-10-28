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
| Quest runtime, progression, phased NPCs, private instances | [Quest progression and phasing](02-architecture/quest-progression-and-phasing.md) | REQUIRED behavior; PROPOSED engine contract |
| Durable state, prototypes, versions, save/restore | [State / persistence](02-architecture/state-persistence.md) | PROPOSED |
| Keyboard/touch/text input and game command pipeline | [Commands + input](03-contracts/commands-and-input.md) | REQUIRED ownership; PROPOSED contract |
| Player-visible room/train/interactions narration and audiences | [Narration/observers](03-contracts/narration-and-observers.md) | REQUIRED behavior; PROPOSED contract |
| Quest condition evaluator, dialogue, typed objective event | [Quest conditions/dialogue](03-contracts/quest-conditions-and-dialogue.md) | PROPOSED |
| Modern Code & Visual Graph scripting UI (indexed tabs) | [Scripting UX](04-features/scripting/INDEX.md) | REQUIRED modes; PROPOSED UI |
| Native engine vs C# vs DSL technical comparison | [Engine/scripting architecture research](08-research/engine-and-scripting-architecture-comparison.md) | RESEARCH / OPEN |
| Script language, API references, # @ {} shorthand proposals | [Language and syntax](03-contracts/script-languages-shortcuts-and-symbols.md) | PROPOSED / OPEN |
| Memory ownership, C++ handles and script isolation | [Memory and script safety](03-contracts/script-memory-ownership-and-safety.md) | REQUIRED safety; PROPOSED contract |
| Unified code/graph runtime and API | [Scripting runtime/ABI](03-contracts/scripting-runtime-and-capabilities.md) | PROPOSED |
| Nodes, custom scripts, execution and APIs | [Scripting + graph](03-contracts/scripting-and-graph.md) | REQUIRED capability; PROPOSED interfaces |
| Remote protocol, sessions, hosting runtime | [Protocol + hosting](03-contracts/protocol-and-hosting.md) | PROPOSED |
| Quest system detailed tabs and subtabs | [Quest specifications](04-features/quests/INDEX.md) | REQUIRED scope; PROPOSED contracts |
| Clickable color/icon cells; room panel; exits | [Map editor](04-features/map-editor.md) | REQUIRED behavior; PROPOSED interaction detail |
| ECS object/Blueprint graphs and inspectors | [Blueprint editor](04-features/blueprint-editor.md) | REQUIRED behavior; PROPOSED graph semantics |
| Quest and dialogue visual graph editor | [Quest editor](04-features/quest-and-dialogue-editor.md) | REQUIRED UX; PROPOSED mechanics |
| Bob -> Joe quest visibility/party/instance test oracle | [Bob/Joe scenario](04-features/bob-joe-quest-scenario.md) | REQUIRED story; PROPOSED test matrix |
| One-click / CLI launch and operations | [Hosting + admin](04-features/hosting-and-admin.md) | REQUIRED behavior; PROPOSED operations |
| Cross-feature train example and end-to-end oracle | [Train station reference scenario](04-features/train-reference-scenario.md) | REQUIRED story; PROPOSED exact cases |
| Dependency graph and sprint gate list | [Sprint index](05-sprints/INDEX.md) | PROPOSED |
| Quest sprint gates and order | [Quest dependencies](05-sprints/quest-implementation-dependencies.md) | PROPOSED |
| Live sprint tracking checklist | [Sprint tracking](SPRINT-TRACKING.md) | LIVE |
| Completed sprint history, rationale | [Sprint history](SPRINT-HISTORY.md) | HISTORY |
| Per-sprint spec template | [Sprint template](05-sprints/specs/SPRINT-SPEC-TEMPLATE.md) | PROPOSED |
| Sprint scope, deliverables and acceptance | [Sprint specifications](05-sprints/sprint-specifications.md) | PROPOSED |
| Project Lead/Builder/Auditor governance | [CLAUDE.md](../CLAUDE.md), [Builder](../.claude/agents/builder.md), [Auditor](../.claude/agents/auditor.md) | PROPOSED based on supplied agent rules |
| Token and dispatch limits | [Token and dispatch policy](06-quality/token-and-dispatch-policy.md) | PROPOSED |
| Rules for AI builders/reviewers | [Agent policy](06-quality/agent-policy.md) | REQUIRED prohibitions; PROPOSED enforcement |
| Verifiable behavior matrix and test policy | [Test matrix](06-quality/test-matrix.md) | PROPOSED |
| Trust boundaries, script sandbox, permissions | [Security policy](06-quality/security-policy.md) | PROPOSED |
| Decisions intentionally not guessed | [Open decisions](07-decisions/OPEN_DECISIONS.md) | OPEN |
| Unity, Godot, C++ Flecs / C# research | [Engine research](08-research/engine-and-scripting-architecture-comparison.md) | RESEARCH |
| C# vs custom DSL and scripting editor references | [Scripting technology research](08-research/scripting-engine-research.md) | RESEARCH |
| Source-backed quest / WoW / Evennia / dialogue research | [Quest research](08-research/quest-design-research.md) | RESEARCH |
| Legacy source audit and earlier v1.1 concept | [Baseline](08-research/legacy-baseline.md) | FACTS |

## Cross-document rules
- Requirements and acceptance stories live in product/features; technical state-transition semantics live in architecture/contracts; test oracles live in quality. Link, do not duplicate entire sections.
- When a document proposes a choice, add a decision entry; do not silently promote it to confirmed.
- Each owning subsystem should have one mutation boundary. The map editor, command parser, scripts and network are clients of the same authority.
- Paths are case-sensitive; ensure all links resolve and index entries are updated for added/renamed files.
- C++ and C# are **candidate engine/runtime technologies**, not an approved stack; the deprecated Java/Python proposals are historical. Engine/API decisions need evidence-backed ADR before implementation.
- Quest eligibility, dialogue, visibility and targetability reuse [one condition evaluator](03-contracts/quest-conditions-and-dialogue.md). Phasing is per-viewer filtering; private instances are distinct world/room copies.
- Actor/location-specific narration is derived from committed events using [one observer projection](03-contracts/narration-and-observers.md), never from duplicate UI/script broadcasts.
- The original Google Doc “MudMaker” records the earlier v1.1 design; use these versioned specifications for current planning.

## Scripting documentation: narrow agent entry points
- [Complete end-to-end diagram: script creation, test, publish, hosting, and live player execution](04-features/scripting/00-end-to-end-lifecycle.md)
- [Code Scripting tabs and subtabs](04-features/scripting/code/INDEX.md)
- [Visual Scripting tabs and subtabs](04-features/scripting/visual/INDEX.md)
- [Scripting symbol, variable and safe references contract](03-contracts/scripting-language-and-references.md)
- [Native C++ and C# scripting architecture research](08-research/native-engine-and-scripting-options.md)
