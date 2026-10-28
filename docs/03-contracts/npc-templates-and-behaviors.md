# NPC templates, behaviors, roles and creator authoring

**Status:** binding product and source-level design contract; runtime implementation pending. This is one ECS character/actor framework, not a new inheritance tree or a second scripting engine. Depends on [combat](combat-and-encounters.md), [inventory](inventory-and-containers.md), [LOOK](look-and-perception.md), [quest lifecycle](../04-features/quests/INDEX.md), [WorldClock/scheduler](../02-architecture/time-events-world-systems.md), [spatial topology](../02-architecture/spatial-containment-transit.md) and [optional local NPC dialogue](optional-local-npc-dialogue.md).

## Evennia research findings and adaptation

Evennia's [Characters](https://www.evennia.com/docs/latest/Components/Characters.html) documentation derives a Character typeclass from DefaultCharacter/DefaultObject. Its [NPC reacting tutorial](https://www.evennia.com/docs/6.x/Howtos/Tutorial-NPC-Reacting.html) subclasses Character and handles entering actors via a room event. Its [listening NPC tutorial](https://www.evennia.com/docs/latest/Howtos/Tutorial-NPC-Listening.html) reacts to heard speech. The [beginner AI tutorial](https://www.evennia.com/docs/latest/Howtos/Beginner-Tutorial/Part3/Beginner-Tutorial-AI.html) uses AI states such as idle, roaming and attack, with cadence varying by behavior. Evennia's [Prototypes and Spawner](https://www.evennia.com/docs/latest/Components/Prototypes.html) permit reusable per-instance overrides, searchable saved templates and spawning without a new Python subclass for every variant. MudMaker applies those capabilities via **component composition plus reusable versioned Blueprints**, not C# inheritance or object typeclass spaghetti.

## Entity vs template vs controller

Any ECS entity can be configured as an NPC using an `NpcActorCapability`; **NPCs use the same character-facing appearance, movement, combatant, equipment, inventories, statuses, perception, dialogue and position services as player-controlled characters**. NPC is not a special database table or a hard requirement for a human-like body, HP or inventory. An enchanted sword, automated turret, animal, statue, vehicle or merchant kiosk may acquire NPC behavior if creator chooses. `NpcActorCapability` enables an autonomous, host-authoritative controller; it does not confer account/session privileges. Player possession/puppeting is a separate explicit authorization mode with restoration rules.

Definitions:
- `NpcBlueprint` is a versioned template storing components, default values, linked behavior graph, role modules, schedules, references and spawn/lifecycle policy.
- `NpcInstance` is an ordinary ECS entity with Blueprint reference, spawn origin, persistent overrides, owner world/region, current context and generation; parent/children are ordinary containment.
- `NpcBrain` is a **controller service registration** per active NPC, not a full OS thread or object permanently executing code. It owns its bounded state machine, subscriptions, next actionable deadline and optional AI-speech eligibility.
- `NpcRoleModule` is a reusable, optional behavior/data package (Guard, Merchant, Quest, Banker, etc.) that can be combined when capabilities allow. Role is **not** a mutually exclusive NPC subclass.
- `NpcBehaviorAsset` is a versioned graph or C# handler binding with explicit triggers, state keys, priorities, fallbacks, allowed effects and limits.
- `NpcPerceptionEvent` is a host-produced observer-scoped event, not omniscient access to every player in the world.

The **Base Character** template supplies common appearance/location/interaction components; an **NPC Starter** adds `NpcActorCapability` and simple Idle controller; templates may inherit from one parent Blueprint and compose multiple role modules in a deterministic order (explicit priority, then stable module ID). Creator edits a child template's field overrides without rewriting the parent. Circular inheritance, mismatched component revisions and conflicting role-owned slots fail publication. A template can be entirely custom, with **no Base Character parent**.

## One-click starter presets

| Preset | Preconfigured capabilities | User-facing quick edit |
|---|---|---|
| Idle / Ambient | LOOKable actor, basic dialogue, idle state | Name, description, greeting, interactions |
| Wanderer / Civilian | Restricted room/region roaming, variable cadence, safe return | Wander area, frequency, prohibited exits |
| Patrol Guard | Ordered patrol route, alert/suspicion rules, pursuit/leash | Waypoints, pause times, chase radius, target rules |
| Aggressive Enemy | Encounter trigger, hostility/faction, attacks, combat clock | Aggro radius, level/stat comparator, combat ruleset, loot |
| Passive / Defensive | Ignore unless threatened, optionally warn or retreat | Response to attack, warning, faction |
| Coward / Fleeing NPC | Panic/health/morale threshold, escape path, return | Flee trigger, safe destinations, re-engage policy |
| Invulnerable / Nonattackable | Attack permission denial before combat | Attackable toggle, safe-zone exception rules |
| Quest Contact | Quest offer, objectives, in-progress reminder, turn-in | Quests, prerequisite stages and per-player dialogue |
| Marketplace Merchant | Real inventory or explicit catalog, buy/sell pricing and stock | Shop inventory, accepted currencies, restock schedule |
| Wandering Trader | Merchant + route/region roaming, interruption policy | Route, trade stops, hours/stock |
| Auctioneer | Auction listings, bids, escrow, expiry and winner settlement | Listing/bid policy and auction jurisdiction |
| Banker / Vault Clerk | Scoped account-character ledger and vault access | Bank permissions, deposit/withdraw fees and limits |
| Crafting / Trainer | Skill/service transactions and teaching conditions | Recipes, costs, eligibility and results |
| Escort / Follower | Party/owner permission, route follow, lag/recovery | Follow distance, teleport prohibited by default |
| Healer / Rescuer | Support targeting and service cost, combat-aware reactions | Heal conditions, resources and consent |
| Conversation / AI roleplay | Authored dialogue; optional on-device model only when enabled | Persona, world description, response eligibility |
| Empty Custom | No mandatory stats/AI/combat/quest roles | Select components, C# scripts and graph from scratch |

All presets are editable ordinary assets; combinations like **patrolling guard + quest contact**, **wandering merchant + combat flee**, or **banker + auctioneer** are supported without a new class. Combat attackability is independent of whether NPC initiates attacks: an aggressive NPC can be non-targetable only by an explicit protected-actor rule; a passive NPC can still defend itself.

## Behavior engine and priority

Host produces typed events for entry/leave, perceived nearby actors, heard authorized speech/sounds, interaction/dialogue, scheduled deadline, damage, combat start/end, ally aid, quest state, stock changes, travel, service transactions and creator-authored domain events. **Event-driven first:** no continuous world scan for idle NPCs. Roaming and patrol timers use the shared indexed WorldClock scheduler with one pending next deadline per active behavior; fight-specific deadlines belong to encounters. At low load, hundreds of NPCs can share one scheduler; neither a dedicated OS thread nor a model instance per NPC.

Each NPC has a small explicit state machine: `Idle`, `Travel`, `Interact`, `Alert`, `Engaged`, `Retreat`, `Unavailable`, plus creator-defined typed states. Default prioritization: host safety/access constraints → active combat danger → emergency retreat → direct interaction → quest/service response → patrol/roam → idle. A creator can rearrange priorities using the inspector, but cannot override native authorization. An NPC already handling a conversation may suspend patrol by preset policy; on completion it resumes from saved waypoint rather than resetting blindly.

NPC actions are **intents**, checked by the existing command/world authority: pathfind to reachable room/cell, speak authorized words, start dialogue, interact, use inventory, request combat action, request service/transaction, register schedule, change limited custom state. No NPC is allowed to bypass locks, phase visibility, safe zones, account identity, hidden inventory or irreversible currency rules. A failed action yields a scoped denial event and next appropriate state; no infinite retry loop.

Behavior budgets: max **32 transitions** and **16 queued follow-up intents** per NPC event chain, max **1 due movement decision per NPC per configured deadline**, max **4 retries** with exponential backoff for transient navigation failures, and no automatic hot-loop catch-up after restart. Idle subscriptions are event-driven; periodic patrol default **20 seconds** (creator-configurable from 1 second to 24 hours). Host-wide per-domain work caps guarantee response to player commands during high NPC count. Despawn cancels subscriptions/deadlines by generation.

## Quest and interaction integration

An NPC may offer, accept, remind, intermediate-credit, complete/turn-in or repeat quests, **independently per player character**. It may be only the checkpoint needed between two other NPCs (e.g. talk to conductor), not necessarily the quest owner. Quest state remains in the quest engine; no duplicate per-NPC ledger. Dialogue choices invoke validated objective-credit intents with evidence/event IDs and idempotency, not a text-string guess.

NPC quests and ordinary dialogue coexist with authored priority rules. If the player has multiple available quests, show eligible offers, active reminders, ready-to-turn-in options and ordinary dialogue in that order; all are explicitly configurable. Private phasing/visibility is checked before target selection and narration. An NPC may move while quests remain active; targeted interactions recheck location, phase and authority at commit.

## Merchant, auction and banking roles

Merchant uses [inventory custody](inventory-and-containers.md) for real stock, one transactional buy/sell gateway, local currency/resource ledger and explicit restock policy. A **virtual catalog** may intentionally mint purchased goods, but only within creator-approved stock and cost constraints; never copy an item secretly. Wandering merchants can pause at route stops, open/close shop by WorldClock and resume after interruption. Item price, tax, reputation discounts, limits, barter and stock refill are ruleset assets.

Auctioneer accepts authorized listings into a **durable escrow**, validates seller custody/ownership and any fees, publishes only allowed listing fields, receives atomic bounded bids, expires at a host-owned scheduled deadline, and delivers the item and funds exactly once (or refunds/releases when canceled). Self-bidding and simultaneous bids have explicit game policy defaults: self-bid **denied**; bids must exceed current price by configured increment; first committed bid at a given value wins until surpassed; losing held funds released atomically. On disconnect, auction remains hosted; host shutdown/restart rehydrates deadline and settlement idempotency. Creator can disable auctions entirely.

Banker exposes scoped ledger/vault operations: deposit, withdraw, transfer, balance, storage access and statement, only after verifying the authenticated actor's rights. Account/character/party-owned vault choices are explicit; internal AccountId never leaks to Player. Currency custody is ledger-based unless creator defined coin objects; deposits and withdrawals cannot mint currency. Optional fees, caps, exchange rates and interest use the shared scheduler and audited durable onceKeys. No raw SQL/C# mutation of bank balance.

## NPC appearance, inventory, death and persistence

NPC LOOK uses [per-viewer appearance projection](look-and-perception.md); hidden or phased NPCs do not leak names via greetings, combat aid cries or vendor search. Inventory and equipment are optional generic capabilities. On defeat, creator chooses corpse-container, keep inventory, drop eligible items, direct rewards or nonlethal recovery; no global assumption that every NPC dies. On despawn, transient NPC-held items follow explicit cleanup/drop/transfer policy; default **persist the NPC and possessions for authored persistent NPCs**, and **despawn only world-spawned transient instances after their configured cleanup policy**. A persistent NPC's patrol route index, suspicion/state, target selection and service inventory resume after restart, subject to reacquired spatial validity. A stale target is cleared rather than teleported.

Spawn caps are per template/zone/world, indexed by spatial scope, with stable spawn origin and no duplication across restart or multi-host requests. Named story NPCs default persistent and unique by scoped spawn key; wildlife can respawn by authored ecology budgets and delays. Death/respawn cannot duplicate quest or merchant stock.

## Creator UX and testability

In the existing **Blueprint / NPC Studio**: pick a starter preset, choose name/appearance, toggle roles, set schedule and roaming boundary, edit behavior graph, attach quests/services/inventory, configure attackability/combat/escape, preview visible perception radius, preview the patrol route and click **Playtest NPC**. Inspector groups: Identity, Appearance, Movement, Behavior, Dialogue, Quests, Combat, Inventory, Services, Schedule, Advanced C#. Basic creators never need a class hierarchy or C#.

Visual nodes: On Actor Enters/Leaves; On Actor Perceived; On Speech Heard; On Dialogue Choice; On Quest Stage; On Timer Due; On Damage/Engage/Retreat; On Stock Changed; On Service Requested; Condition Faction/Stat/Range/Quest; Navigate to Waypoint; Call for Aid; Request Flee; Offer/Complete Quest; Open Shop; Quote/Buy/Sell; List/Place Bid/Settle Auction; Open Bank/Deposit/Withdraw; Show Authored Dialogue; Request Local NPC Speech. Every node is typed, bounded, debuggable and parity-checked with C#.

**Live test fixture:** make an idle shopkeeper, wandering guard with a 4-waypoint patrol, neutral bandit that attacks at defined aggro radius then flees below morale threshold, invulnerable quest giver, and wandering merchant/banker. Spawn them into a two-room plus outdoor grid fixture in the running shell and Player Client. Use two users to confirm separate quest states, inventory and service access. Show NPC state, schedule next deadline, perceived stimuli, path, reason for aggression, missing permissions and resulting committed events in a Creator-only inspector; never expose hidden player data to other players. Test crossing rooms, closed doors, moving trains, multiple NPCs hearing one cry, combat disconnect, restart, server throttling, restock and transaction recovery.

## Typed NPC source contract and graph parity

Canonical lifecycle hooks: `npc.actor.spawned.after`, `npc.actor.despawning.before`, `npc.actor.despawned.after`, `npc.actor.perceived.after`, `npc.actor.entered_scope.after`, `npc.actor.left_scope.after`, `npc.actor.heard_speech.after`, `npc.actor.heard_sound.after`, `npc.actor.interaction.before`, `npc.actor.interaction.after`, `npc.behavior.evaluate.before`, `npc.behavior.state_changed.after`, `npc.behavior.action_rejected.after`, `npc.navigation.waypoint_reached.after`, `npc.navigation.route_blocked.after`, `npc.service.requested.before`, `npc.service.completed.after`, `npc.trade.stock_changed.after`, `npc.quest.stage_eligible.after`, `npc.quest.objective_credited.after`, `npc.schedule.due.after`, `npc.dialogue.respond.before`, `npc.dialogue.respond.after`. Hooks use typed `NpcLifecycleEvent` with host-scoped observer snapshots, except `npc.service.*` uses `NpcServiceEvent`. Before hooks may veto/bounded-propose, after hooks enqueue independently validated commands only. Never pass raw secret inventory, other players' hidden quest state, credentials or private bank records. The source-level JSON, C# and Protobuf definitions are the implementation interface; `runtimeImplemented: false` remains accurate until a Builder/Auditor demonstrates execution. The optional local LLM **only generates utterances**, never decides authoritative quests, trades or movement.

## Acceptance and dependencies

S03 ECS NpcActorCapability and reusable components; S04 versioned Blueprint/instance persistence; S05 movement, visibility and spatial subscriptions; S06 commands/interactions; S07 host-side perceptions and optional NPC speech; S08 Player NPC interactions; S09 NPC Studio and template editor; S10 behavior controller/patrol and world schedules; S11 quest dialogue; S12 world travel; S13 C# behavior hooks and graph parity; S15 integrated authored NPC service workflows; S18 stress/security audits. This design requires live human-testing controls from the first NPC behavior slice, not a mock demo.

**Universal template library:** NPC presets, multi-role NPCs, their variations, custom ECS creatures and every other creator-made object use the same [project-persistent Template Library](reusable-templates-and-variants.md). Save, rename, search, tag, group, duplicate, create variations, archive and delete safely from the Blueprint inspector. No NPC-specific storage or template manager. Parent revisions are pinned and existing NPC instances do not silently change on template edits.

**ECS object principle:** [Universal ECS Objects and Exits](ecs-objects-and-exits.md) confirms NPCs, players, furniture, doors, items and rooms are all entities. NPC Starter is a convenient component composition, never a required Character subclass. Arbitrary creator-authored entities can attach NPC control if authorized, including sentient tools or moving vehicles.
