# Research: Quest Chains, Branching, Phasing, Instances and Dialogue

**Date:** 2026-10-28. **Status:** source-backed research + MudMaker recommendations; NOT an assertion that MudMaker implements any of these mechanics. **Task:** translate mature WoW/MMO/MUD quest capabilities into game-agnostic ECS contracts and visual authoring, without copying proprietary systems or branded UI.

## Further verified references
[TrinityCore QuestDef.h](https://github.com/TrinityCore/TrinityCore/blob/master/src/server/game/Quests/QuestDef.h) distinguishes possession from acquisition, optional/ordered/hidden objectives, talk and area events. [Quest template](https://trinitycore.info/database/master/world/quest_template) distinguishes guaranteed and choice rewards. [Quest template addon](https://trinitycore.info/database/master/world/quest_template_addon) records prerequisite/next quest and exclusion patterns. [Blizzard Party Sync](https://worldofwarcraft.blizzard.com/en-us/news/23451087) demonstrates temporary aligned quest phases and configurable-equivalent replay boundaries. [Blizzard War Within quest UI](https://news.blizzard.com/en-us/article/24117139/user-interface-and-quest-updates-in-the-war-withintm) categorizes main/side/repeatable/meta content; those labels should be presentation, not hardcoded quest-engine subclasses. See eight-part [Quest System](../04-features/quests/INDEX.md).

## Evidence and conclusions

### World of Warcraft: presentation categories and quest breadth
Blizzard's [War Within UI and Quest Updates](https://news.blizzard.com/en-us/article/24117139/user-interface-and-quest-updates-in-the-war-withintm) distinguishes campaign, legendary, repeatable, in-progress, important, meta, local story and turn-in quests in its interface. These are partly player-facing **labels/statuses**, not necessarily mutually exclusive runtime mechanics. Do not mistakenly implement one Java class per label. Support semantic tags/presentation separately from objective type, repeat policy, scope and prerequisite graph.

Blizzard's [Legion World Quests and You](https://worldofwarcraft.blizzard.com/en-us/news/20252892/legion-world-quests-and-you) describes world quest rotation, differing durations, region-wide availability, solo/group/PvP/dungeon/profession/boss content and variable rewards. This supports a generic combination of scope + eligibility + schedule + objective predicates rather than hardcoded "world quest" special cases.

The [Warcraft Wiki quest taxonomy](https://warcraft.wiki.gg/wiki/Breadcrumb_quest) provides supplementary community detail: collect, kill, deliver, escort, craft, explore, reputation, dungeon, raid, PvP and more. This is contextual, not primary engine design authority.

### WoW phasing vs co-op consequences
[Warcraft Wiki Phasing](https://warcraft.wiki.gg/wiki/Phasing) describes areas/NPCs appearing differently according to quest progress, sometimes hiding players across phases. **Important:** a conditional NPC that only Joe's quest-holder sees does not intrinsically require copying the world or room. The projection/interaction layer may instead filter an entity for each observer.

Blizzard's official [Party Sync](https://worldofwarcraft.blizzard.com/en-us/news/23451087/explore-azeroth-with-friends-using-party-sync) aligns party members to a shared quest state/phase and supports temporary quest replay with restrictions; developers deliberately decide which quests are replayable. This is strong evidence that player-specific phasing requires explicit social/party policy. Do not invent an automatic "party shares every quest" default.

### Quest data and condition system
The [TrinityCore quest_template schema](https://trinitycore.info/database/master/world/quest_template) separates quest IDs, eligibility, reward-next-quest, objective requirements (items, NPCs), flags (daily/weekly, sharing) and descriptions. [TrinityCore conditions](https://trinitycore.info/database/master/world/conditions) includes checks for accepted/completed/rewarded quest states and objective progress as conditions on multiple game systems. **Design lesson:** a central typed Condition Evaluator should be reusable by dialogue, content visibility, NPC activation, room exits, item interactions and quest prerequisites. Do not force every feature to invent its own if/else quest checks.

Schema internals and field constraints are specific to TrinityCore's emulated game and **should not be copied literally** into MudMaker. Examples such as a fixed number of objectives or predefined quest IDs are specifically inappropriate for a customizable engine.

### Evennia
Evennia's [quest handler API](https://www.evennia.com/docs/latest/api/evennia.contrib.tutorials.evadventure.quests.html) keeps quest progress on characters, progresses steps and persists quest data; completion can start another quest. The [beginner quest tutorial](https://www.evennia.com/docs/latest/Howtos/Beginner-Tutorial/Part3/Beginner-Tutorial-Quests.html) discusses accepted/abandoned/failed/completed lifecycle and persistence but explicitly warns its tutorial has serious bugs. **Design lesson:** support lifecycle and persistent steps, but do not treat that tutorial implementation as production-ready or restrict users to hand-written subclass methods.

### Branching dialogue/narrative
[Yarn Spinner's runner model](https://yarnspinner.dev/docs/godot/gdscript/02-understanding-yarn-spinner/) separates dialogue lines/options/conditions/variables from presentation and calls into game code via commands. [ink writing documentation](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) illustrates branches, reusable sections, conditional choices and reconvergence. Both support a developer-friendly graph or authoring DSL rather than intermixing dialogue text and ECS mutation. MudMaker should have a dedicated Dialogue/Quest graph view with typed condition/action nodes, while reusing central gameplay capabilities.

## Comparison matrix: research -> required design category
| Existing precedent | MudMaker responsibility |
|---|---|
| WoW campaign/local story/world quest labels | Presentation tags + quest categories + search/filter, not hardcoded engine subclasses |
| WoW phase-dependent NPCs/areas | Per-observer entity projection, conditional interaction, optional actual isolated instances |
| WoW Party Sync / replay | Explicit configurable party sharing, temporary synchronization, reward/replay policy |
| TrinityCore prerequisites / objective progress | Versioned graph nodes, typed conditions, scope-aware progress, prerequisite and exclusion predicates |
| TrinityCore daily/weekly/world rotation | Schedule, recurrence, reset and reward eligibility owned by world clock/quest progression |
| Evennia step tracking | Durable per-owner quest progress, lifecycle and API for graph/script integration |
| Yarn Spinner / ink | Dialogue nodes, options, conditions, branching, variables, subgraphs, typed commands and preview |

## High-impact risks / gaps to research before implementation
- **Visibility:** hidden from look output, room object list, search, examine, interact, targeting, narration, event subscriptions and any API. Hiding only the GUI is a security and correctness flaw.
- **Sharing:** Does each party member get independent objective credit, a shared instance, copied progression, or merely a temporary display phase? Those are different features.
- **Temporality:** quest availability before acceptance, after abandon/failure, after completion/reward, repeat reset, world clock restart.
- **Reversibility and choices:** mutually exclusive branches, rejoining, changing decisions, replay and rollback. Must avoid duplicated rewards or rewriting completed history.
- **Progress sources:** event-driven gather/kill/talk/visit/craft/escort/time/puzzle/world interactions; event actor and participation evidence; idempotency and scope.
- **Runtime costs:** do not evaluate every quest and phase for every entity on every tick. Subscribe by event, index eligible watchers, cache projections with explicit invalidation, benchmark.
- **Security:** a hidden Joe must be non-targetable by unauthorized player via guessed entity ID; cannot leak through narration, map data or session event projections.
- **Authoring usability:** plain-language choices "Show Joe only while Find Joe is active", not scripts required for standard workflow; preview 3+ different quest states.

## Source limits
Blizzard sources describe user-visible behavior but do not expose authoritative server internals. TrinityCore documents an open-source emulator schema, not Blizzard's private architecture. Evennia sample/tutorial is explicitly not fully production-ready. Yarn Spinner and ink demonstrate design options, not chosen dependencies. The MudMaker implementation is a new design proposal subject to ADR approval, not a reverse-engineered clone.
