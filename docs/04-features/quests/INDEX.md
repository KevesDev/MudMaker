# Quest System | Topic Index

**Status:** owner-confirmed goals, detailed behavior PROPOSED for review. **Source:** [MudMaker docs root](../../INDEX.md). This folder is the *quest feature-domain index*. Do not load every file at once. Read this index, then ONLY the tab/subtopic relevant to the task.

## One-sentence design
A Quest is a versioned, creator-defined workflow combining **eligibility + an objective graph + progression state + dialogue + visibility/instancing + rewards + lifecycle + multiplayer policies + custom hooks**; all state mutations are performed by ECS authority. *Quest types* are combinations of these properties, not separate hardcoded subsystems.

## Tabs / subtabs: route by question
| Tab | Subtab / targeted question | Read only |
|---|---|---|
| 1. Foundations | Every field of a quest, saved assets, quest progress and validation | [01 — Quest definition anatomy](01-quest-definition-and-lifecycle.md) |
| 2. Objectives | Escort, kill, level/class milestone, discover, collect via loot/pickup/purchase, talk, custom script | [02 — Objectives and credit semantics](02-objective-catalog-and-credit.md) |
| 3. Quest chains | Linear, branches, multi-prerequisite, parallel, mutually exclusive, breadcrumb, replay and reset | [03 — Quest chain topology](03-chains-and-dependencies.md) |
| 4. Dialogue | Pre-quest, offer, confirmation, progress, reminder, turn-in, completion, post-quest, interrupt | [04 — Dialogue phases and priority](04-dialogue-stages.md) |
| 5. Rewards | Guaranteed, choice, weighted/chance, surprise, level/class gating, loot tables, repeat claims | [05 — Rewards and distribution](05-rewards-and-loot.md) |
| 6. Eligibility & views | Visibility, class/level/faction gating, party sync, private instancing, phase-sensitive objects | [06 — Eligibility and instancing](06-eligibility-phasing-and-parties.md) |
| 7. Creator UX | Beginner wizard, visual branch graph, searchable palette, templates, error preview, touch UI | [07 — Quest editor workflows](07-visual-authoring-and-validation.md) |
| 8. Quality | Comprehensive cross-category scenarios/negative cases and test oracles | [08 — Quest verification matrix](08-quest-verification-matrix.md) |
| 9. Hooks and custom scripting | Stage overrides, scripted questions, name-based rewards, on-interact and world event start/stop | [09 — Custom scripts and event hooks](09-custom-scripts-and-event-hooks.md) |

## Related authoritative technical contracts — do not duplicate ownership
- ECS per-player quest state / phase / instances: [quest runtime](../../02-architecture/quest-progression-and-phasing.md).
- Unified condition evaluator, dialogue selection action, event attribution: [quest conditions](../../03-contracts/quest-conditions-and-dialogue.md).
- Graph/Blueprint compiler: [scripting and graph](../../03-contracts/scripting-and-graph.md).
- Quest callbacks are defined by [custom stage/script hooks](09-custom-scripts-and-event-hooks.md); code/graph UI documentation is in [Scripting UX](../scripting/INDEX.md).
- Per-observer gameplay messages: [narration/observers](../../03-contracts/narration-and-observers.md).
- Formal Bob/Joe case: [Bob/Joe test fixture](../bob-joe-quest-scenario.md).
- User experience design: [quest editor overview](../quest-and-dialogue-editor.md).
- Sequencing: [quest dependencies](../../05-sprints/quest-implementation-dependencies.md).
- Research evidence and limitations: [WoW/TrinityCore/Evennia/Yarn/ink references](../../08-research/quest-design-research.md).
- Unresolved architecture: [ADR register](../../07-decisions/OPEN_DECISIONS.md).

## Index vocabulary (keep consistent)
**Quest definition** = reusable versioned asset; **quest attempt** = one owner/period-specific lifecycle; **objective** = credited criterion, not reward; **quest chain** = dependencies/transitions across quests; **dialogue asset** = text/choices and effects; **condition** = pure typed predicate; **phasing** = observer-specific shared-world projection; **instancing** = isolated world/entity subset with its own IDs; **hook binding** = a versioned script/graph callback attached to a stage or event; **reward grant** = atomic, audited ECS transaction; **observer narration** = committed-event player message.

## Agent economy
Quest-related sprint dispatch cites this index + the specific target subtab + approved ECS/conditions contract and the exact sprint specification. Do not open all nine quest files if working on only random rewards or escort credit. Each topic has named behavioral requirements; if a detail is marked OPEN, stop instead of inferring a numeric default or business rule. Architecture changes must update only the authoritative owner and the index links.
