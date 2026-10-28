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
| **Automatic local databases, Creator Data Manager, optional backup, safe restore, access controls** | [Local storage and Data Manager](03-contracts/local-database-and-data-manager.md) | REQUIRED experience; PROPOSED implementation pending ADR |
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

## Technical case studies (read only when the task requires the full vertical slice)
- [Midnight Express: exact proposed ECS data types, four C#-style scripts, C++ ECS world actor, script-worker protocol, graph equivalence, transactional outbox, diagrams and tests](04-features/scripting/07-midnight-express-technical-case-study.md) — PROPOSED technical example, not implemented code.

## Scripting v1 — current agent authority
- [Scripting API v1: indexed technical contracts, local-host deployment, hooks, refs, persistent engine overrides, C# source, protobuf, test gates](03-contracts/scripting-v1/INDEX.md) — **DECIDED CONTRACT / NOT IMPLEMENTED**. Begin here for scripting work; preceding proposal pages are historical context.

## Real C# scripting source and Evennia reference (current)
- [Host startup / stop → compile → publish → restart / player-to-hook dispatch](03-contracts/scripting-v1/09-build-publish-restart-run.md) — real C# examples, implementation boundaries, no hot reload requirement.
- [Evennia 108-hook/method source mapping](08-research/evennia-hook-parity/INDEX.md) — 89 distinct MudMaker counterparts, pinned upstream commit, 7 separate small index pages.
- [121 exact hook signatures and C# method catalog](../examples/scripting/hook-catalog/INDEX.md) plus [actual game-oriented family samples](../examples/scripting/hook-families/README.md) — source-level SDK only.
- [Runnable C# SDK assertion project](../examples/scripting/tests/MudMaker.ScriptContractChecks.csproj) — compile/run required, **not yet executed**.

## Scripting deliverables / verified status
- [Concrete scripting v1 deliverables and evidence gates](03-contracts/scripting-v1/DELIVERABLES.md) — actual file paths and honest source-versus-runtime status.

## Current editor appearance and sprint execution authority
- [Central ThemeManager and dark graph-paper canvas](03-contracts/editor-theme-manager.md) — **DECIDED visual contract**, user-editable themes, one source for font/color/spacing and grid tokens. No dotted node canvas or per-screen styles.
- [118 small, testable phases across 17 sprints](05-sprints/specs/INDEX.md) and [current 0/N tracker](SPRINT-TRACKING.md) — **one Builder + one independent scoped Auditor per phase**, actual user-testable milestone and evidence before checkoff.
- [S02 UI/theme deliverables](05-sprints/specs/S02.md); [S13 C#/Proto/dispatch deliverables](05-sprints/specs/S13.md); [S17 startup/recovery deliverables](05-sprints/specs/S17.md).

## Whole product UI/UX, external MUD client and machine control inventory (current)
| Need | Open exactly |
|---|---|
| UI/UX agent router and distinct Editor/Player Client/Host workspaces | [UI/UX index](03-contracts/ui-ux/INDEX.md) |
| Every planned visible control, tooltip, action, owner and test ID | [Machine UI control index](../contracts/ui/v1/INDEX.md) |
| Play non-MudMaker MUDs safely with a real client | [Client toolkit](03-contracts/ui-ux/05-player-client-workspace.md), [protocol adapters](03-contracts/ui-ux/06-external-mud-protocols.md) |
| Local mini mapper, hotkeys, aliases, triggers, timers | [Client mapper/automation](03-contracts/ui-ux/07-mapper-and-automation.md) |
| Common ThemeManager with independent client/editor preferences | [UI theme scopes](03-contracts/ui-ux/03-theme-and-preferences.md), [original theme rules](03-contracts/editor-theme-manager.md) |
| Small scoped implementation after S07 + S02 | [S08 Player Client sprint](05-sprints/specs/S08.md) |


## Prompt and map integration

[Evennia-informed authoritative map and prompt/HUD contract](03-contracts/prompt-and-world-map.md): typed per-observer location/status projections, Creator map metadata and prompt presets, local Player UI customization, and third-party text fallback. Implement only the phases assigned to this sprint in the [canonical tracker](SPRINT-TRACKING.md). A prompt is a player-facing status display, not an input parser or an LLM prompt. Never reveal hidden room/exit data, fake a status value, or allow client presentation to mutate world state.

## Accounts, character creation and hooks

[Account, character, session, permission, registration/login/logout and one visual workflow graph](03-contracts/account-character-lifecycle.md) — REQUIREMENTS / PROPOSED contract; includes Evennia lifecycle research and version-gated C# hooks. [Dedicated Creator sprint](05-sprints/specs/S14.md) builds on early identity/auth and S13 graphs. Exact hook IDs remain governed by the [scripting registry](03-contracts/scripting-v1/03-hook-registry.md).

**Optional local NPC dialogue:** [CPU-first embedded model research, roleplay boundaries and hardware gates](03-contracts/optional-local-npc-dialogue.md). Off by default; the wizard is S02, verified model packs S04, first real NPC dialogue S07, Play testing S08, visual nodes S09, C# hooks S13, and later Host/release checks S17–S18.

**Combat and encounters:** [Configurable rulesets, aggression, fleeing, hearing, timing and UI](03-contracts/combat-and-encounters.md) · [Tollbridge Ambush technical case with visual graphs and illustrative C#/C++](04-features/scripting/08-combat-technical-case-study.md).

**Generic inventories:** [Any-entity storage, containers, stacks, equipment, access, trades and Creator presets](03-contracts/inventory-and-containers.md) · [Traveling Merchant's Chest worked example](04-features/scripting/09-inventory-technical-case-study.md). One containment model for every entity, with visual nodes and C# bindings.

**LOOK and perception:** [Canonical LOOK/LOOK AT/LOOK IN/EXAMINE, virtual details, authorized appearance and Creator UX](03-contracts/look-and-perception.md) · [Midnight Express LOOK technical case](04-features/scripting/10-look-technical-case-study.md).

**NPC creation:** [Composable templates, autonomous states, quests, services, AI and Creator NPC Studio](03-contracts/npc-templates-and-behaviors.md) · [Northgate NPC technical case study](04-features/scripting/11-npc-technical-case-study.md).

**Universal Creator Template Library:** [Save any authored object as a template; persistent variants, search, tags, folders, rename and safe deletion](03-contracts/reusable-templates-and-variants.md).

**Universal ECS objects and exits:** [Objects, doors-as-exits, locks, traversal lifecycle, slow exits and Evennia comparison](03-contracts/ecs-objects-and-exits.md). This is the cross-feature component authority, not a second object system.

**Communication and channels:** [Typed SAY/WHISPER/SHOUT/EMOTE/PAGE, audience scopes and message permissions](03-contracts/communication-and-channels.md).

**Attributes, money and basic item commands:** [Typed money fields and default GET/PUT/GIVE parsers](03-contracts/attributes-currency-and-inventory-commands.md).

**Crafting graph tutorial:** [Craft sword using 3 Wood, 2 Iron, skill 2 and a Workbench, atomically](04-features/scripting/12-crafting-graph-tutorial.md).

**Parties, groups, factions and reputation:** [Shared ECS relationship contract](03-contracts/groups-factions-and-reputation.md).

**Bundled sample:** [MudMaker Tutorial World project and acceptance](04-features/tutorial-world-starter-project.md).
