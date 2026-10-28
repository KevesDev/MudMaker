# Combat and encounter architecture

**Status:** proposed product contract, not implemented. Combat must support radically different MUDs without forking the authoritative ECS or creating a second visual programming system. [Worked example](../04-features/scripting/08-combat-technical-case-study.md) · [Midnight Express precedent](../04-features/scripting/07-midnight-express-technical-case-study.md).

## Design rule: composition, not one mandatory combat genre

A world defines a versioned **CombatRuleset** made from independent, replaceable policies: EncounterAdmission, Faction/Threat, Target/Range, TurnClock, ActionEconomy, Stats/Formula, ResourceCosts, Defense/Resolution, Conditions, EquipmentWear, NPCBehavior, Escape/Pursuit, Death/Recovery, Rewards and Narration. Each zone/arena/encounter may apply authorized overrides without silently changing active ruleset versions. Creators choose presets with sensible defaults, edit all fields in the same Blueprint/node inspector and, when necessary, bind typed visual graph nodes or approved C# handlers. **No mandatory HP, strength, level, dice, damage, class, weapon, PvP, skill, loot or combat timer.** An encounter may be purely conversational or nonlethal.

The world engine owns authoritative state, identities, visibility, cooldowns, RNG streams, intents, policy checks, commit and event/outbox. Combat encounters have **independent lightweight timing state** backed by the existing [WorldClock and indexed deadline service](../02-architecture/time-events-world-systems.md#scheduling-domains-and-scale). This is a shared time authority, not one global combat tick, one timer per world, or one operating-system thread per fight. Hundreds of encounters may proceed at different rates without waiting on regional weather. Both graphs and C# receive typed snapshots and propose approved effects, never modify ECS directly. Avoid a separate scripting DSL or unrelated combat-form editor.

## Genre and mechanic coverage matrix

| Creator experience | Configuration / runtime primitive |
|---|---|
| Pokémon / JRPG turn-taking, 1v1/party and switch | Discrete rounds; initiative/order; action selection queue; switch/replace actor; team roster; type/element relationships; ordered resolution; consumable turns |
| Strict alternating, simultaneous reveal, initiative rolls | TurnClock policy: alternating / initiative-sorted / all-submit-then-resolve / one-side-then-other; deterministic tie rule |
| D&D/Pathfinder-like dice, saves and reactions | Dice-expression roll nodes; typed action/reaction budgets; advantage/situational modifier policies; interruption hooks; bounded reaction stack |
| WoW-like real-time cooldown/GCD/channel/cast | Monotonic host timeline; cast start/commit/interruption; per-ability and global cooldowns; resource tick; movement, range, line of sight |
| ATB/charge gauge, hybrid rounds+realtime, WEGO | Explicit phase/state machine with tick-driven gauges, timed input windows, simultaneous locked intents, server-owned deadlines |
| Action-by-action MUD combat pulses / autoattack | Repeating scheduler pulse; autoattack intents selected by policy; manual skills/stance overrides; deterministic cancellation |
| Tactical grid, chess-like, cover, terrain | Target topology (cell adjacency, path distance, ray/LOS, obstacles, cover, height); movement cost and opportunity triggers |
| Room-based, no grid, zones and distance bands | Topology adapter: same room, near/mid/far, adjacent rooms, graph path hops; never assume coordinates |
| Ranged attacks across rooms/cells; AoE/cones | Range/shape policy with visibility and permission checks; shape projected to affected valid targets before commit |
| PvE, PvP, duels, arenas, FFA, noncombat safe zones | Actor/team/faction targeting policy, consent/safe-zone flags, staff overrides subject to host hard limits |
| Aggressive, passive, neutral, defensive, cowardly NPCs | Perception → disposition/threat → decision rules; trigger thresholds, patrol/home radius, leash and retreat |
| Level-based aggro, reputation, crime, hostility | Comparison expressions using creator-chosen stats (including absent level); relative/absolute bands, faction and quest state |
| Assist calls, pack swarms, hearing radius | Authorized sound event with origin, noise falloff, occlusion/topology, recipient perceptions and aid eligibility; e.g. 20 *cells* only where cells exist |
| Taunts, threat/aggro tables, stealth, detection | Scoped threat state, decay, provocation and stealth/perception predicates; no automatic disclosure of hidden targets |
| Chase, disengage, flee, surrender, capture | Contest/clock/route policy; exits/doors and movements resolved by same world topology; combat end/continuation explicit |
| Pets, companions, summons, mounts, party roles | Controlled actors with separate identity/resources/ownership, action slots and command authority; no account impersonation |
| Custom stats, classes, skills, XP/levels | Typed schema-defined numeric/enum/bool fields; derived stats; validate bounds, snapshots and versioning |
| HP/MP/stamina, ammo, energy, action points | Generic resource pool with regen/spend/lock/refund policy; atomic spend only on validated outcome |
| Weapons, armor, enchantments, durability | Equipment slots, granted moves, item quality/resistance and transactional durability consumption; broken equipment policy |
| Buffs, debuffs, poison, burns, crowd control | Conditions with stacking, expiry/clock, immunity, dispel, reapplication, aura and persistence rules |
| Element types, resistances, hit/crit/dodge | Creatable damage/healing/resource transfer types with exact formula pipelines and typed defense modifiers |
| Healing, shields, parries, counters | Action/Reaction nodes and redirect/absorb/reflect policy with bounded depth; validate projected recipients |
| Damage over time, hazards, traps | Scheduled effects keyed by owner/instance with cancellation, durable next-fire, no event-loop reentrancy |
| Nonlethal, permadeath, respawn, injury | DefeatPolicy: unconscious/captured/dead/respawn, equipment loss/recovery and retention; no universal kill semantics |
| Rewards, loot, contribution, anti-farm | Host-authoritative participation ledger, onceKeys, reward grants and durable recovery; anti-duplication |
| Boss phases, puzzles and environmental combat | World event/condition predicates, stage graph, scripted/graph-triggered mechanics and arena rules |
| Social/negotiation contest, sports or other conflicts | Same intent/turn/contest framework with alternative victory resources and no physical damage |
| Async/offline turn games, PvP tournaments | Persisted encounter phase, expiry and reconnect policy; host clock and conflict resolution, no offline unbounded actions |
| Cross-server/spectator replay | Observer-scoped committed events + replay IDs; remote/spectator views never gain hidden or controlling authority |

## Core typed assets and services (proposed names)

- `CombatRulesetAsset`: versioned collection of policies and default skill/resource definitions.
- `CombatAbilityAsset`: costs, eligibility, target query, windup/cast/channel/cooldown, effect graph, interrupts, outcome/narration templates, failure refund.
- `CombatEncounter`: world+encounter ID, release/ruleset, participants/team membership, positions, phase/timeline, active targets and public/private visibility.
- `CombatIntent`: authenticated source Session→Character identity, ability, target selector, expected revision, nonce, client timestamp for display only; server stamps receipt and sequence.
- `CombatParticipant`: actor ref, team, engagement state, threat, action budgets, eligible control session; do not copy character ownership.
- `CombatClock`: **per-encounter** timing state (turn phase, cast/cooldown/reaction deadlines and cancellation generation) with indexed next-deadline registration in the shared host scheduler; never a private thread or always-ticking polling loop.
- `CombatOutcome`: validated host proposal (typed resource/stat/position/condition/equipment changes) + RNG receipt + domain events + narration audiences; commit atomically and publish via outbox.
- `CombatDebugTrace`: creator-authorized, redacted explanation of gates, rolls, costs, durations and event IDs; not exposed to adversaries in live play.

Pipeline is **Intent → admission/auth → encounter snapshot → range/perception/turn/cost checks → resolve policy and RNG → validate proposed effects → single atomic commit → event/outbox → per-observer narration and UI updates**. Rejects must not spend a turn, item, action point, resource or durability unless rules explicitly define a committed attempt-cost. A rejected/replayed packet must not double-hit or double-award.

## Timing, space and pursuit

Combat must not freeze the shared WorldClock or durable scheduler described in [Time, Events & World Systems](../02-architecture/time-events-world-systems.md#scheduling-domains-and-scale). Hundreds of simultaneous fights must have independently owned clocks and bounded dispatch work. Group co-due deadlines by fair budgets and measure scheduling latency under load; don't scan all active combatants each world tick. Turn-based encounters keep their own deterministic phase and may coexist with real-time travel and weather. Real-time abilities use monotonic host clocks and stored recovery cursors; never trust client timers or wall clock. Simultaneous resolution uses snapshot/commit conflict rules, not nondeterministic thread order. Interruptions cannot recurse unboundedly. Network latency compensation must be explicit and capped; never allow retroactive edits to committed turns.

Distance and hearing are separate typed policies. `20 cells` means a bounded spatial-index/range query on a cell-based map; in a room graph the creator chooses 20 hops, weighted distance or sound transmission edges instead. Hearing respects barriers, region rules, silence, privacy, stealth and observer phase. An aid cry is **one committed audible event**, not N direct calls into surrounding NPC scripts. Listeners independently evaluate allegiance, combat readiness, capacity, cooldown and path availability; a call for help does not teleport assistance or override access restrictions. Pursuit obeys actual exit permissions and route changes; flee may succeed even while pursuers stay engaged until disengagement rules complete.

## Accessible Creator experience and first-class test UI

One **Combat Studio** inside existing Creator Blueprint/graph UI:
1. Pick preset: Text Pulse, Turn-Based Duel, Tactical/Party, Real-Time Abilities, Hybrid/ATB, or Empty Custom; presets configure policies, not engine branches.
2. Edit actor/NPC stats, resources, abilities, equipment/durability, timing, targeting, hostility and victory/flee/chase policy with typed inspectors and inline defaults.
3. Author encounter state and reactions with the existing node graph; optional advanced C# uses the **same** typed event/effect service, not a separate combat UI or raw ECS pointers.
4. **Run in app now:** spawn local test actors, click/issue abilities, watch room/cell range and hearing overlays, advance one turn/tick, inspect costs/cooldowns/outcomes and reset to a baseline test fixture.
5. Playtest through real Player Client, with accessible action list, targets, cast/cooldown/status indicators, combat log, turn prompt and actionable failure reasons. UI sends intents, does not resolve damage locally.

Every sprint implementing a material combat capability must ship its necessary visible controls **in that same sprint**; the first combat slice cannot wait for later full Creator or release tooling. Reuse S02 SharedUI, S03 ECS, S04 storage, S05 topology, S06 commands, S07 host and S08 Player. Add incremental combat phases after these dependencies and before deep world authoring, with a usable in-app demonstration at least every few phases.

## Security, persistence and failure acceptance

- PvP/duel consent, safe zones, actor permissions, hidden targets and authorized controls checked server-side on every intent and effect; scripts and AI never authorize a forbidden action.
- Account/Character/Session IDs remain separate; reconnect does not grant two moves; NPC AI text cannot become a trusted combat command.
- One RNG seed/stream per appropriate scope, recorded version/roll digest for replay/debug and anti-cheat; caller cannot choose authoritative randomness.
- Persist active encounter phase, pending intents, cast/condition deadlines, cooldown state and resource/equipment changes; define restore behavior for offline actors and expired rounds.
- Disconnection, death mid-cast, double-target, simultaneous kill, hidden target, room transition, teleport, asset hot edit, corrupt save, process crash, outbox replay and high NPC density are explicit negative tests.
- Run performance/load profiles for 2/4-core low-end servers with thousands of idle NPCs and bounded active encounters; visual UI must not hold engine ticks.
- Publish and migration require compatibility checks; running encounters pin release versions or follow explicit migration/abort policy.

## Implementation ownership

C++ engine owns ECS, scheduler, topology, combat resolver and authoritative commits. Versioned assets live in local embedded project DB. C#14/.NET10 sandbox and graph compiler attach typed hooks/actions once registered in the JSON/CLR/Protobuf contracts. Every hook name in the worked case study is **proposed only**, never assumed already in `hooks.v1.json`. Full implementations need host-side DTOs, schemas, security/authority tests, graph parity and real in-app Play/Creator evidence.

## Full creator-owned C# CombatManager (first-class requirement)

A creator may **replace all default combat mechanics** with their own C#14 CombatManager, not merely modify damage numbers. The host supplies **authoritative primitives**, not a mandatory genre: scoped manager registration (per actor, team, encounter, location, arena, zone, world), typed custom versioned state, validated operations, deterministic RNG/clock, event routing, and explicit manager lifecycle. The creator chooses how and when combat begins, which entities join, action collection/resolution order, timers, target ranges, resource formulas, effects, victory/retreat/defeat, and how players interact.

**Manager contract:** register versioned manager asset and scope/predicate; activate on an authorized event, create/join/leave/merge/split/finish encounters, transfer ownership only with explicit atomic policy, resolve actor death/logout/reconnect or world release changes, persist/restore manager cursor, expire or cancel registered timers, and observe authorized actor/world events. Multiple handlers may coexist on the same world or room if rules permit; conflict policies decide whether a character can join multiple engagements. Never hardcode one handler per room or combatant.

**No privileged bypass:** C# code can choose whether its rules count "health" or "damage" but can only mutate allowed custom state through typed/validated effects. Movement must still pass world topology and access rules, equipment transfer through inventory authority, player control through Account/Session/Character authorization and narration through per-observer publication. The host may reject or abort a manager's effect; scripts cannot alter native authorization invariants, invoke raw SQL or extend execution indefinitely.

### Proposed typed scripting hook coverage — NOT registered/implemented

| Hook family (proposed names) | Creator-defined manager use / expected safe scope |
|---|---|
| `combat.manager.activate.before/after` | Qualify/create manager instance; choose ruleset and owner scope |
| `combat.manager.restore/stop` | Restart recovery, cancelled encounter and cleanup (no bypassing durable state) |
| `combat.encounter.create/join/leave/merge/split/end` | Manage membership, consent, team assignment and independent encounter clocks |
| `combat.actor.perceived/targeted/moved/disconnected/reconnected/defeated` | Host-authorized world events, actor control and visibility changes |
| `combat.intent.received/validated/rejected/queued/cancelled` | Custom action vocabulary and admission, legal queued inputs and failure feedback |
| `combat.round.open/lock/resolve/close` | Turn order, deadlines, simultaneous submissions, resolution and progression |
| `combat.clock.tick/timer.due/timer.cancelled` | Persistent pulse, cast/reaction windows, periodic conditions and bounded timers |
| `combat.ability.start/resolve/interrupted/completed` | Casts, cooldown, custom costs and chosen effect pipeline |
| `combat.reaction.requested/resolved` | Parry, counter, intercept, opportunity and bounded nested reactions |
| `combat.effect.beforeCommit/committed/rejected` | Validate proposed stat, condition, equipment and position effects; after events read-only |
| `combat.sound.heard/aid.requested` | Ally calls, hearing, aggression and assistance using observer-authorized world events |
| `combat.flee.requested/pursuit.updated` | Retreat, leash, chase, actual exits, movement and outcome |
| `combat.condition.applied/ticked/removed` | Custom status stacks, turn-versus-real-time expiry, persistence outside encounters |
| `combat.equipment.changed/durability.changed` | Item/armor modifiers and wear, only after valid inventory/equipment operations |
| `combat.reward.requested/committed` | Contribution, loot, XP, anti-duplication and owner-approved rewards |
| `combat.narration.project` | Typed audience-safe messages; no hidden event/state disclosure |

These are **candidate families**, not approved literal hook IDs. Some are native engine events rather than script interception points; each entry needs a documented before/after/cancellable distinction, event fields, capability scopes, valid effects, error behavior and ordering. The ABI must be expanded **atomically** across `contracts/scripting/v1/hooks.v1.json`, `MudMaker.Scripting.Abstractions/Contracts.cs`, `mudmaker_scripting_v1.proto`, host dispatcher, graph-node catalog and tests. Existing v1 bindings must continue to function; additive versioning and a clear deprecation/migration policy are required.

### Custom manager APIs beyond hooks

Hooks alone are insufficient. A typed SDK must expose scoped read-only snapshots of actor stats/custom fields, equipment, condition state, encounter membership, authorized world topology, session control eligibility, action queues and remaining time; a transactional effect builder for custom stat writes, resource exchanges, conditions, status, damage-as-custom-stat, item wear, world movement requests, encounter state and rewards; and bounded scheduler/RNG services. Typed C# manager code must be able to **register its own custom action names and stat schemas**, with publish-time validation and Player action-menu metadata, without requiring the Builder to hardcode new abilities.

### Evennia crosswalk and extra tests

The Evennia 6.x beginner lessons document a common action/handler base for [twitch](https://www.evennia.com/docs/6.x/Howtos/Beginner-Tutorial/Part3/Beginner-Tutorial-Combat-Twitch.html) and [turn-based](https://www.evennia.com/docs/6.x/Howtos/Beginner-Tutorial/Part3/Beginner-Tutorial-Combat-Turnbased.html) combat; the former times individual actor actions, the latter collects choices centrally and resolves at deadline or when all choose. [Turnbattle](https://www.evennia.com/docs/latest/Contribs/Contrib-Turnbattle.html) adds equipment, items, status effects, magic, and relative range. MudMaker should explicitly test those distinctions in the same native authority model.

Additional acceptance cases: a room has two independent encounters; a custom manager tied to one actor follows legal room movement; two actors fight with no Level/HP field; queued turn actions auto-resolve early when all submit; timed twitch action and turn-based encounter coexist; temporary paralysis survives combat and converts to real-time expiry; an ally joins mid-round; a creator switches to an alternate manager on a published world; an unhandled manager crash cannot strand players in combat; a manager's requested movement or hidden-target hit is rejected; a custom combat action appears in both Player Client and command parser; manager script is replayed after restart without double damage or rewards. No mandatory `CombatManager` superclass should grant direct ECS pointers or raw database access.
