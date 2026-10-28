# Combat and encounter architecture

**Status:** binding design decisions complete; implementation not yet built. Combat must support radically different MUDs without forking the authoritative ECS or creating a second visual programming system. [Worked example](../04-features/scripting/08-combat-technical-case-study.md) · [Midnight Express precedent](../04-features/scripting/07-midnight-express-technical-case-study.md).

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

## Core typed assets and services (canonical names)

- `CombatRulesetAsset`: versioned collection of policies and default skill/resource definitions.
- `CombatAbilityAsset`: costs, eligibility, target query, windup/cast/channel/cooldown, effect graph, interrupts, outcome/narration templates, failure refund.
- `CombatEncounter`: world+encounter ID, release/ruleset, participants/team membership, positions, phase/timeline, active targets and public/private visibility.
- `CombatIntent`: authenticated source Session→Character identity, ability, target selector, expected revision, nonce, client timestamp for display only; server stamps receipt and sequence.
- `CombatParticipant`: actor ref, team, engagement state, threat, action budgets, eligible control session; do not copy character ownership.
- `CombatClock`: **per-encounter** timing state (turn phase, cast/cooldown/reaction deadlines and cancellation generation) with indexed next-deadline registration in the shared host scheduler; never a private thread or always-ticking polling loop.
- `CombatOutcome`: validated host proposal (typed resource/stat/position/condition/equipment changes) + RNG receipt + domain events + narration audiences; commit atomically and publish via outbox.
- `CombatDebugTrace`: creator-authorized, redacted explanation of gates, rolls, costs, durations and event IDs; not exposed to adversaries in live play.

Pipeline is **Intent → admission/auth → encounter snapshot → range/perception/turn/cost checks → resolve policy and RNG → validate requested effects → single atomic commit → event/outbox → per-observer narration and UI updates**. Rejects must not spend a turn, item, action point, resource or durability unless rules explicitly define a committed attempt-cost. A rejected/replayed packet must not double-hit or double-award.

## Timing, space and pursuit

Combat must not freeze the shared WorldClock or durable scheduler described in [Time, Events & World Systems](../02-architecture/time-events-world-systems.md#scheduling-domains-and-scale). Hundreds of simultaneous fights must have independently owned clocks and bounded dispatch work. Group co-due deadlines by fair budgets and measure scheduling latency under load; don't scan all active combatants each world tick. Turn-based encounters keep their own deterministic phase and may coexist with real-time travel and weather. Real-time abilities use monotonic host clocks and stored recovery cursors; never trust client timers or wall clock. Simultaneous resolution uses snapshot/commit conflict rules, not nondeterministic thread order. Interruptions cannot recurse unboundedly. Network latency compensation must be explicit and capped; never allow retroactive edits to committed turns.

Distance and hearing are separate typed policies. `20 cells` means a bounded spatial-index/range query on a cell-based map; in room-only maps the default adapter is shortest traversable directed path hops; sound uses traversable sound edges with closed barriers blocking it; creators can override via the same policy graph. Hearing respects barriers, region rules, silence, privacy, stealth and observer phase. An aid cry is **one committed audible event**, not N direct calls into surrounding NPC scripts. Listeners independently evaluate allegiance, combat readiness, capacity, cooldown and path availability; a call for help does not teleport assistance or override access restrictions. Pursuit obeys actual exit permissions and route changes; flee may succeed even while pursuers stay engaged until disengagement rules complete.

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
- One RNG stream per encounter, seeded from host-managed world RNG, recorded version/roll digest for replay/debug and anti-cheat; caller cannot choose authoritative randomness.
- Persist active encounter phase, pending intents, cast/condition deadlines, cooldown state and resource/equipment changes; restore elapsed wall-clock deadlines with bounded catch-up: at most one overdue resolution per encounter, then advance next deadlines; preserve paused turn-based phases.
- Disconnection, death mid-cast, double-target, simultaneous kill, hidden target, room transition, teleport, asset hot edit, corrupt save, process crash, outbox replay and high NPC density are explicit negative tests.
- Run performance/load profiles for 2/4-core low-end servers with thousands of idle NPCs and bounded active encounters; visual UI must not hold engine ticks.
- Publish and migration require compatibility checks; running encounters pin release versions or follow explicit migration/abort policy.

## Implementation ownership

C++ engine owns ECS, scheduler, topology, combat resolver and authoritative commits. Versioned assets live in local embedded project DB. C#14/.NET10 sandbox and graph compiler attach typed hooks/actions once registered in the JSON/CLR/Protobuf contracts. Hook names in the older worked case study are illustrative aliases; the hook registry is the canonical executable contract. Runtime readiness is represented separately by `runtimeImplemented`, never inferred from documentation. Full implementations need host-side DTOs, schemas, security/authority tests, graph parity and real in-app Play/Creator evidence.

## Full creator-owned C# CombatManager (first-class requirement)

A creator may **replace all default combat mechanics** with their own C#14 CombatManager, not merely modify damage numbers. The host supplies **authoritative primitives**, not a mandatory genre: scoped manager registration (per actor, team, encounter, location, arena, zone, world), typed custom versioned state, validated operations, deterministic RNG/clock, event routing, and explicit manager lifecycle. The creator configures how and when combat begins, which entities join, action collection/resolution order, timers, target ranges, resource formulas, effects, victory/retreat/defeat, and how players interact.

**Manager contract:** register versioned manager asset and scope/predicate; activate on an authorized event, create/join/leave/merge/split/finish encounters, transfer ownership only with explicit atomic policy, resolve actor death/logout/reconnect or world release changes, persist/restore manager cursor, expire or cancel registered timers, and observe authorized actor/world events. Multiple handlers may coexist on the same world or room if rules permit; by default each character can participate in only one encounter; explicit multi-encounter capability overrides this if all affected encounter managers allow it. Never hardcode one handler per room or combatant.

**No privileged bypass:** C# code can choose whether its rules count "health" or "damage" but can only mutate allowed custom state through typed/validated effects. Movement must still pass world topology and access rules, equipment transfer through inventory authority, player control through Account/Session/Character authorization and narration through per-observer publication. The host may reject or abort a manager's effect; scripts cannot alter native authorization invariants, invoke raw SQL or extend execution indefinitely.

### Registered combat source contract — canonical hook IDs

The entries below are **fully defined source-level hook IDs** in `contracts/scripting/v1/hooks.v1.json` (every entry has `runtimeImplemented: false` until Builder/Auditor verification). All use `CombatLifecycleEvent` in the C# source contract and `CombatLifecycleEvent` on Protobuf. The connection-control hooks additionally use `CombatControlEvent`. These are the canonical identifiers; any shorthand in the older Tollbridge illustrative code is not an alternative API.

| Service area | Exact hook IDs |
|---|---|
| Manager lifecycle, scope, restore and cleanup | `combat.manager.activate.before`, `combat.manager.activate.after`, `combat.manager.restore.after`, `combat.manager.stop.after` |
| Encounter membership and terminal state | `combat.encounter.create.before`, `combat.encounter.create.after`, `combat.encounter.join.before`, `combat.encounter.join.after`, `combat.encounter.leave.before`, `combat.encounter.leave.after`, `combat.encounter.merge.before`, `combat.encounter.merge.after`, `combat.encounter.split.before`, `combat.encounter.split.after`, `combat.encounter.end.before`, `combat.encounter.end.after` |
| Perceived world/actor lifecycle | `combat.actor.perceived.after`, `combat.actor.targeted.after`, `combat.actor.moved.after`, `combat.actor.disconnected.after`, `combat.actor.reconnected.after`, `combat.actor.defeated.after` |
| Command intent admission and queues | `combat.intent.received.after`, `combat.intent.validated.after`, `combat.intent.rejected.after`, `combat.intent.queued.after`, `combat.intent.cancelled.after` |
| Turn and phase progression | `combat.round.open.after`, `combat.round.lock.after`, `combat.round.resolve.before`, `combat.round.resolve.after`, `combat.round.close.after` |
| Encounter-local clock notifications | `combat.clock.tick.after` |
| Shared scheduler occurrence lifecycle | `combat.timer.due.after`, `combat.timer.cancelled.after` |
| Casting, channeling and ability lifecycle | `combat.ability.start.before`, `combat.ability.start.after`, `combat.ability.resolve.before`, `combat.ability.resolve.after`, `combat.ability.interrupted.after`, `combat.ability.completed.after` |
| Counters and bounded reactions | `combat.reaction.requested.before`, `combat.reaction.resolved.after` |
| Native effect proposal and committed outcome | `combat.effect.before_commit.before`, `combat.effect.committed.after`, `combat.effect.rejected.after` |
| Audible observer-scoped combat facts | `combat.sound.heard.after` |
| Assistance requests | `combat.aid.requested.after` |
| Retreat and movement validation | `combat.flee.requested.before` |
| Chase state | `combat.pursuit.updated.after` |
| Status effects | `combat.condition.applied.after`, `combat.condition.ticked.after`, `combat.condition.removed.after` |
| Worn/held item changes | `combat.equipment.changed.after` |
| Equipment wear | `combat.durability.changed.after` |
| Reward authorization and ledger | `combat.reward.requested.before`, `combat.reward.committed.after` |
| Observer-safe output | `combat.narration.project.query` |
| Connection control | `combat.participant.control_lost.after`, `combat.participant.grace_expired.after`, `combat.participant.control_restored.after` |

**Dispatch rules:** `Before` hooks run after immutable identity/access/visibility checks, may veto or return capability-bounded proposals, and cannot override host invariants. `After` hooks receive a committed observer-authorized snapshot and may only enqueue separately validated actions; `Query` hooks are pure, including narration projection. All combat events have immutable event ID, encounter/manager IDs, causation, host timestamp, expected revision, permissible actor/target and a scope-filtered snapshot; forbidden fields are omitted, not masked by guesswork. Timeout/crash fails closed for pending proposals, records the failure, and never rolls back prior commits. Native services ensure atomic ECS writes, stable dedup keys, bounded depth and durable outbox. The host-defined manager effect codes are: `encounter.create`, `encounter.join`, `encounter.leave`, `encounter.end`, `intent.queue`, `intent.cancel`, `phase.set`, `timer.schedule`, `timer.cancel`, `field.adjust`, `condition.apply`, `condition.remove`, `equipment.wear`, `movement.request`, `sound.emit`, `narration.emit`, `reward.request`. Unsupported action codes are rejected. Each code has an authorization/capability check and schema-bound argument key/value; C# cannot write ECS directly.

**Custom action/stat registration:** Creators publish `CombatActionDefinition` (stable asset key, typed argument fields, targeting rule, icon/label, command aliases and localizable result text), `CombatStatDefinition` (component field schema, bounds and computed-default function), and `CombatManagerDefinition` (scope, clock policy, behavior binding, permitted effects). No base HP/level requirement. Publish-time schema validation checks field IDs, graph port types, duplicate actions, cyclic formula dependency and capability manifests; each action's Player controls and text command invoke the same host validator. Active encounters pin manager/ability versions until ended. `StateSlotRef` is used for persistent manager state with entity/encounter scoping and expected revision, not arbitrary global variable writes. New code is installed with versioned hook registry/CLR/Protobuf contracts before game publishing.


### Custom manager APIs beyond hooks

Hooks alone are insufficient. A typed SDK must expose scoped read-only snapshots of actor stats/custom fields, equipment, condition state, encounter membership, authorized world topology, session control eligibility, action queues and remaining time; a transactional effect builder for custom stat writes, resource exchanges, conditions, status, damage-as-custom-stat, item wear, world movement requests, encounter state and rewards; and bounded scheduler/RNG services. Typed C# manager code must be able to **register its own custom action names and stat schemas**, with publish-time validation and Player action-menu metadata, without requiring the Builder to hardcode new abilities.

### Evennia crosswalk and extra tests

The Evennia 6.x beginner lessons document a common action/handler base for [twitch](https://www.evennia.com/docs/6.x/Howtos/Beginner-Tutorial/Part3/Beginner-Tutorial-Combat-Twitch.html) and [turn-based](https://www.evennia.com/docs/6.x/Howtos/Beginner-Tutorial/Part3/Beginner-Tutorial-Combat-Turnbased.html) combat; the former times individual actor actions, the latter collects choices centrally and resolves at deadline or when all choose. [Turnbattle](https://www.evennia.com/docs/latest/Contribs/Contrib-Turnbattle.html) adds equipment, items, status effects, magic, and relative range. MudMaker should explicitly test those distinctions in the same native authority model.

Additional acceptance cases: a room has two independent encounters; a custom manager tied to one actor follows legal room movement; two actors fight with no Level/HP field; queued turn actions auto-resolve early when all submit; timed twitch action and turn-based encounter coexist; temporary paralysis survives combat and converts to real-time expiry; an ally joins mid-round; a creator switches to an alternate manager on a published world; an unhandled manager crash cannot strand players in combat; a manager's requested movement or hidden-target hit is rejected; a custom combat action appears in both Player Client and command parser; manager script is replayed after restart without double damage or rewards. No mandatory `CombatManager` superclass should grant direct ECS pointers or raw database access.

## Fixed engine defaults for empty/new combat assets

New world combat is disabled until a creator attaches a CombatRuleset. The **Text Pulse** template uses a 2,000 ms encounter pulse, one action per actor per pulse, one autoattack per participant if opted in, a 3,000 ms example ability cooldown, optional Health/Stamina components created by the template, and nonlethal unconscious defeat by default. PvP is disabled by default; safe-zone and visibility restrictions always take precedence. Player attacks require valid authorized targets and range. Default disconnected behavior is `ContinueAuto` for 30 seconds, then `DefendOnly` until encounter ends; logout does not erase the character. For a new encounter missing an explicitly selected policy, this template's policy applies. All other presets are independent concrete ruleset assets and do not alter the engine defaults.

All times are host monotonic deadlines with durable world-clock reconstruction. The native scheduler keeps only next deadlines, fair-batches due work, limits nested reaction depth to 8 and event cascade depth to 16, and rejects excess work with a structured failure; it never spins a timer thread per fight. Concurrent intents resolve by server-assigned receipt sequence within a round, with simultaneous rounds using one frozen snapshot and stable actor-ID tie breaker. A denied intent has zero costs unless an explicitly author-authored *attempt cost* is separately accepted and committed. Effect batching is atomic; replay is deduplicated by world/encounter/intent/onceKey.

Published CombatManager assets are immutable by revision for running encounters. New encounters use latest published revisions; active ones retain their pinned revision until completion. Host recovery reloads manager cursor, phase, event dedup ledger and deadlines. For overdue time, process at most one overdue combat resolution per encounter on resume, then skip/coalesce obsolete pulses while retaining a durable recovery trace. A manager exception cancels its in-flight proposal, retains committed state, and quarantines that manager instance with a clear Host/Creator error; it never strands other encounters.

## Player disconnect and combat continuation

Connection state belongs to the authenticated **Session**, not the Character. A character can have zero, one or multiple authorized sessions, so loss of one socket does **not** automatically mean the character has lost control. The host computes a read-only combat-facing `CombatConnectionSnapshot` per participant: `ControlState` = `Online` (at least one authorized controlling session), `LinkLost` (all controlling sessions abruptly lost), `GracePeriod`, `Offline` (grace expired), or `Reconnected` transition; `DisconnectedAt`, `GraceDeadline`, `LastAcceptedIntentId`, `ControllingSessionCount`, `ReasonCode` (bounded non-sensitive reason), and `Revision`. This is persisted as needed for a deterministic encounter policy but cannot be set by player clients or C# scripts. `Reconnected` is an event, not an indefinitely held state. Deliberate logout, unpuppet, staff revocation, transport failure, host shutdown and kick/ban are separately classified; scripts cannot override security revocation.

**Typed notifications:** `combat.participant.control_lost.after`, `combat.participant.grace_expired.after` and `combat.participant.control_restored.after` are the canonical combat-aware events; they carry `EncounterId`, `CharacterRef`, old/new state, host-stamped time/deadline, cause and event ID, never credentials or raw SessionId. The underlying session lifecycle remains authoritative; the combat manager receives a notification **only when the controlling-session aggregate changes**. A session drop with another controlling session active must not generate control-lost. A reconnect must authenticate and pass puppeting/ownership checks before a control-restored event. Notifications may enqueue validated effects but cannot veto disconnect or authentication.

**Creator-defined disconnect policy per ruleset/encounter:** ContinueAI (character chooses legal AI actions); ContinueAuto (only existing queued/auto actions); WaitGrace (pause that actor's decision clock, with a bounded server-owned deadline); SkipTurn; DefendOnly; Retreat (normal path/exit checks); Forfeit (host-validated outcome); RemainVulnerable; and CustomGraph/CSharp (receive typed notifications, choose bounded effects/next state). A creator may define conditional policy per PvP/PvE, encounter mode and logout cause. No policy should silently make disconnected characters invulnerable, immortal or instantly teleport; such protection must be an explicit game rule subject to global PvP/safe-zone and abuse safeguards. Server continues to run other encounters and world timers. Long-duration offline games may use different timeouts than real-time PvP.

**Reconnection:** retain encounter/membership, authorized queued action identifiers, resource/cooldown state and the participant's pending phase while policy permits. On successful reconnect, send an observer-authorized snapshot and valid next action state; **do not replay queued intents as new actions**, double-spend a resource, reset an opponent's turn or duplicate rewards. A stale or revoked session remains denied. The grace timer is a per-participant deadline in the existing indexed scheduler, not a new thread and not one global combat timer. Rapid network flapping must be bounded and must not indefinitely refresh grace.

**Creator UX and audit:** The Combat Studio has a *Disconnect behavior* selector, grace timeout, policy conditions, and `On Control Lost / Grace Expired / Control Restored` nodes; the C# manager receives the same typed events and a read-only connection snapshot. In-app playtest provides an explicit *Simulate socket loss* control backed by a real local session disconnect (not a fabricated state flag), a second-player view and reconnect control. Auditor tests mid-round drops, mid-cast, multiple sessions, forfeit abuse, grace expiry, crash/restart, missed deadlines, packet replay and Player UI synchronization.
