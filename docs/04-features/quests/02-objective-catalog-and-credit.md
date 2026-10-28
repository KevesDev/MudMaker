# 02 | Complete Objective Catalog, Provenance and Credit

**Status:** REQUIRED breadth; PROPOSED mechanics and fields; exact default credit policy OPEN. **Owner:** Quest Objective Registry + Event Attribution under ECS Quest Progression. **Primary evidence:** [TrinityCore QuestObjectiveType](https://github.com/TrinityCore/TrinityCore/blob/master/src/server/game/Quests/QuestDef.h), [quest_template](https://trinitycore.info/database/master/world/quest_template), [WoW quest UI categories](https://news.blizzard.com/en-us/article/24117139/user-interface-and-quest-updates-in-the-war-withintm). These are reference precedents, not implementation instructions.

## Every objective's common definition
ObjectiveId (stable within quest version), display title/description, objective provider ID and version, authoritative event or state predicate, target selector (entity ID/blueprint type/component tags/region/condition), actor/participant requirements, owner scope, expected count/threshold or temporal duration, progress accumulation (increment/cumulative snapshot/hold state/unique set/sequential), pre-accept credit policy, deduplication key, visibility in journal (shown/hidden/optional), trigger activation order, sharing/participation policy, failure/reset policy, completion effect hooks, quest phase and version, source/correlation ID, optional map marker, diagnostics and typed conditions. Every objective type **must** declare how credit is produced, persisted, reset, and reversed, if reversal is allowed.

### Critical semantic distinctions
- **State-based:** "Have at least 5 crystals in inventory now" recalculates from authoritative inventory; dropping one may reduce eligibility.
- **Event-based:** "Obtain 5 crystals after accepting" credits only qualifying acquisitions; dropping them does not un-credit unless specified.
- **Unique-source:** "Discover 3 different places" needs unique stable location ID set; visiting same room repeatedly does not count.
- **Duration:** "Escort Bob safely for 5 minutes" uses one world clock and failure policy; a client timer does not count.
- **Progress delta:** "Earn 100 reputation after acceptance" measures increase from defined baseline, unlike "Have reputation >= 100".
- **Count:** kill 5 target creatures; decide lethal blow vs contribution/group sharing and whether summoned/pet kills qualify.
- **Triggered:** script/custom Blueprint emits namespaced typed event; only authorized server-committed events can credit.

## Catalog by capability (composable rather than mutually exclusive subclasses)
| Objective family | Variants the creator must be able to configure | Authoritative evidence and pitfalls |
|---|---|---|
| Talk / dialogue | Interact NPC; greet; finish dialogue node; select specific choice; turn in item via conversation; speak in order; repeat after state change | `ActorInteracted` != `DialogueChoiceCommitted`; actor/target/version/state gate. No progress from mere NPC visibility |
| Reach / locate / discover | Enter named location, any eligible room in region, reach coordinate/area trigger, reveal hidden site, exit via portal, inspect landmark, stay for interval, waypoint order | `EnteredLocation` vs `DiscoveredLocation`; unique discovery and radius definitions explicit; train interior/instanced location IDs resolved |
| Collect / obtain | Pick up world drop, loot from killed enemy, harvest resource, purchase/trade, crafted output, reward from another quest, mailed/delivered to player, NPC gift, container open, gather in specified area | Creator chooses allowed **source** set; item type/quality/origin/ownership, cap; avoid counting inventory copy/spawn from malicious client |
| Possess / deliver | Have items at turn-in, keep until quest complete, hand over N to NPC, place in container, mail/drop at target, consume specific quest items | Inventory snapshot and atomic consume vs track acquisition; stack changes, lost items, trade-away after counting, failed consume rollback |
| Kill / defeat | Kill mobs/NPCs, bosses, enemy type/tag, combat nonlethal defeat, player PvP defeat, unique target, in region, kill using ability, protect NPC during battle | Crediting policies: last hit, eligible damage/heal/tank contribution, group distance/instance, summon/pet, no dupes on respawn/replay |
| Escort / protect | Follow NPC/convoy/train to destination, guard moving NPC, keep health above threshold, survive ambush, stay close, navigate checkpoints, timed defense, rescue/recover | Owner follows one ECS movement/containment lifecycle; explicit start/end, fail on death/too far, path blocking, party members, reconnect/restart; no fake teleport |
| Level / class / specialization | Reach level X, advance X levels after quest begins, class-specific milestone, learn required class ability, change specialization, unlock role/subclass; account milestone if desired | **Eligibility** vs **objective** distinct: at least level X now vs must *gain* levels after acceptance; role/class schema customizable by game |
| Skill / crafting / gathering | Raise skill or profession tier, learn recipe, craft item with quality, harvest resource, refine/build machine, build structure, equip/loadout, use recipe ingredients | Earned delta vs threshold; provenance, who crafted vs who transferred item; quality/uniqueness |
| Currency / reputation / faction | Hold currency, earn since start, spend/donate, achieve rank, increase faction standing, choose allegiance, influence regional reputation | Holdings vs earned vs spent vs net change; policy on loss and repeated grants |
| Interact / use / activate | Pull lever, unlock/repair door, interact with a train, board/disembark, activate switch, equip/use item, cast ability, trade/speak with object, click ordered consoles | Named typed custom `ActionCommitted`; authorization, phase, lock, item and target, result state. Failed attempts don't credit |
| Exploration / puzzle | Inspect clues, choose dialogue, combine objects, discover secret, solve sequence, enter code, control machines, unique clue collection, complete puzzle graph | Progress gate from validated server event and/or persistent world condition; prevent brute-force side-channel leakage |
| Survive / timed | Stay alive N time, remain in zone, avoid death, wait for event/time, complete before timer, hold objective continuously, timed checkpoint sequence | World clock pause/restart/offline policy, death/reset, dwell timer persistence and anti-AFK/participation if enabled |
| Social / cooperative | Join party, help others, heal/defend escort, complete shared objective, bring group to location, trade with another player, guild/community tasks | Per-member consent, credit attribution, shared limits, group eligibility; avoid multi-account farming policy gaps |
| Dynamic / world / instance | Weather event, world boss, defend region, spawn suppression, train arrived, control point, dungeon/raid completion, regional contribution threshold | Event ID + region/instance + member participation; do not credit unrelated group/world |
| Achievement / meta | Complete a collection of quests, milestones, optional challenges, discover all locations, finish custom state graph, reputation chain | Event or snapshot over persistent prior quest records; no fragile recursive quest-completion loop |
| Custom scripted / plugin | Any creator-provided typed event, condition query, validated action, graph hook or safe script evaluating game-specific fact | Registered event schema/allowed caller/capabilities, bounded script, actor provenance, version pin, no arbitrary "complete quest" client message |

## Collect item source configuration — mandatory explicit sub-panel
Allowed source methods: **world pickup, corpse loot, enemy drop, vendor purchase, player trade, craft output, resource harvesting, quest reward, NPC dialogue gift, mail/storage transfer, custom event**. Select multiple; each source can have target NPC/template/loot table/region/quality/rarity filters.
- Define when item is credited: transfer of ownership to actor, to party, merely seeing a drop, possession at turn-in, source event, quality grade or origin.
- Define pre-existing items allowed, traded vs bound, repeat pickup/drop exploit prevention, stack split/merge, dropped-on-death, quest-only item handling, quest-start grant cleanup, full inventory delivery failure.
- Define whether collection must happen **after** acceptance; acquisition time/event provenance is required. After restart counts must not be recreated from item total unless state semantics intentionally do so.
- If a quest grants a crystal which also qualifies another quest, both can be credited only under each quest's creator rules and event ordering; item shouldn't be duplicated.

## Kill / combat credit configuration
Pick kill/defeat/assist and actual damage threshold or contribution logic, target blueprint/tag/faction/region/instance/level constraints, unique target ID vs respawned instance, party/raid sharing, proximity, last-hit policy, pets/summons and NPC ally eligibility, death timing vs event time, counter cap, PvP exploit protections, failure/reset and message visibility. No assumptions inherited from WoW game specifics.

## Escort / defense configuration
Select escort target entity/blueprint, path checkpoints or destination condition (can be a moving train), required survival/health, distance/party following, allowed teleport/repath, start/stop trigger, fail if killed/lost/timeout/abandoned, reset/restart behavior, escort NPC visibility to owner/party, reward eligibility by active participation. Independent world instance optional, not automatic.
- Real ECS movement and exits determine position; quest does not own its own private NPC movement subsystem.
- World events like TrainDocked, CharacterEnteredCar or NPCReachedWaypoint feed one shared objective registry.

## Scripts and custom objective transitions
Any quest objective can attach a typed custom graph/script to its availability, interaction, credited, satisfied or failed stage. Scripts may produce named, authenticated domain events and propose objective effects through ECS commands, but cannot create arbitrary credited progress by client assertion. Optional quiz/dialogue gate can be an objective that advances only on verified server-side choice. For full hooks, failure/retry and custom world event semantics, read [09 — Hooks](09-custom-scripts-and-event-hooks.md); objective credit/provenance remains owned here.

## Requirement for every new objective provider
Define typed inputs, independently verifiable committed event/snapshot, owner/actor attribution, condition flags, progress serialization, idempotency, invalidation, UI forms and labels, error code, and tests for success+false positive. Unsupported behavior is blocked at authoring, not silently approximated.

## Refer to
[Quest definition](01-quest-definition-and-lifecycle.md) · [Chains](03-chains-and-dependencies.md) · [Reward policy](05-rewards-and-loot.md) · [Quest oracle](08-quest-verification-matrix.md).
