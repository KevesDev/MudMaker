# Quest Progression, Quest-Driven Visibility, and Instanced Content

**Status:** REQUIRED behavior by owner example; PROPOSED detailed contract. **Owner:** Quest Progression System, Conditional Projection System, Instance Manager; all built on **one ECS runtime authority**. **Dependencies:** ecs-core, spatial/containment, world events/time, persistence, commands, narration, protocol.

## Non-negotiable separation
1. **Quest Definition:** immutable versioned authoring asset describing eligibility, objectives, branches, rewards, resets and presentation.
2. **Quest Progress State:** durable state per named **owner scope** (character/account/party/world/instance according to creator choice and policy). Lives in world/owner ECS state and persistence; not duplicated in UI, NPC entity, dialogue runtime and network.
3. **Quest Condition Evaluator:** pure read API, typed expressions reused by quest eligibility, dialogue, NPC visibility, interactability, exits, rewards, map projections and world-system triggers. Must resolve **whose** quest progress is being read.
4. **Conditional Projection/Phasing:** decides what each observer can see, examine, target, hear and interact with in the *same shared world*. It is not equivalent to a private world instance.
5. **Instance Manager:** allocates and tears down actual isolated room/entity subgraphs with unique instance/world scope and explicit membership, persistence, party and capacity policy. This is only required when the content truly needs independent state (private dungeon/encounter, individual fight), not merely different observers.
6. **Dialogue Runtime:** selects per-actor dialogue choices and produces validated quest actions, using same Condition Evaluator and ECS command gateway. Dialogue isn't stored as scattered branch logic on NPC.
7. **Narration Projection:** filters the committed events and audience; must not reveal phased-out Joe or quest secrets.

## Proposed ECS schema concepts
- `QuestDefinitionId + QuestDefinitionVersion`: stable asset reference, distinct from per-owner quest attempt.
- `QuestProgress`: owner scope/id, quest definition version, attempt ID, lifecycle state, active objective IDs/counters, branch decisions, durable flags, timers, claimed rewards, event/high-water cursor, creation/update timestamps.
- `QuestAvailability`: computed from prerequisite/eligibility predicates, not a second independently mutable truth store.
- `QuestMarker / InteractionBinding`: NPC/object points to dialogue or quest interface, priority and availability expression. Quest progress belongs to the participant, not the NPC.
- `PhaseRule`: subject entity or world feature, scoped condition and presentation/interaction policy. Entity may be globally stored but selectively projected.
- `InstanceTemplate/InstanceMembership`: source room/encounter template, unique live instance ID, parent world, membership, shutdown, resource/save and expiry policies. Entity instance IDs never alias global/shared IDs.
- `QuestEventSubscription`: indexed quest objective handler by typed committed event and owner/participant scope, not an expensive per-tick scan across every player quest.

**Data model and storage representation are PROPOSED**. Exact Java classes/database layout and index structures must be approved in ECS/persistence ADRs.

## Quest lifecycle
Recommended states: NotAvailable, Available, Offered, Active, ObjectivesSatisfied, ReadyToTurnIn, Completed, Rewarded, Failed, Abandoned, Expired, Suspended. Treat **availability** as computed and **attempt lifecycle** as durable, so not every computed label is stored as a mutable field. Exact transitions depend on quest acceptance/reward policy (automatic completion, explicit turn-in, repeatable, failure/retry). State machine must reject illegal transitions and ambiguous double reward. New quest from Bob can be granted during the same authorized transition that completes Talk to Bob (either atomic grouped command or transactional outbox with documented no-loss semantics). Repeatable quests create distinguishable attempts/reward periods. No arbitrary rollback of completed choice branch without explicit admin rule and audit.

## Objective model and chain graph
Quest graph is typed directed graph of objectives, gates, branches and transitions. Primitive objective predicates include: talk with NPC (valid interaction event), visit/enter/leave location, kill/defeat with participation policy, collect/possess/turn in item, craft/use/equip/deliver, escort/protect entity, operate trigger, reputation/skill/stat threshold, survive/timer, puzzle/custom typed event, group/world event, discover, and counter/sequence/composite. All primitives are **configurable and extensible**, not restricted to these genres.
- `ALL` / `ANY` / counts / ordered sequence / parallel tasks / optional task / AND/OR/NOT conditions / mutually exclusive choice / convergence / time window / custom expression.
- Explicit prerequisite and blocking/exclusive quest conditions for chains. Cycle validation distinguishes authored repeat loops (bounded/controlled) from accidental unreachable cycles.
- Player/party/account/world attribution and objective-sharing policy must be declared. One player speaking to Bob must not complete every group member's quest unless configured.
- Event matching uses stable entity/template/region/type refs, actor/target roles, origin/destination, typed predicates, idempotency key and allowed quest version. Clients cannot claim quest progression directly by sending a forged `QuestObjectiveComplete` action.
- Progression trigger may grant follow-up quests, spawn NPC, alter dialogue/visibility, move actors, unlock exits, run cutscene, create separate instance and reward. Those effects go through commands with permissions and transaction boundaries.

## Phase / visibility rules
**Visibility is observer-relative.** A Joe entity can remain in room B while only players with `Find Joe` active (or creator-selected subsequent states) can `see`, `list`, `examine`, `target`, `interact`, or `receive narration` involving Joe. Same room, different perceptions.
- Creator chooses per phase rule whether to suppress presence, allow read-only viewing, allow interaction, substitute another entity/description, or change behavior/dialogue. Hidden should be inaccessible in **all** gameplay APIs, not merely filtered from terminal text.
- Differentiate: a) **concealed** NPC, b) phase-visible same shared NPC, c) per-player projected NPC variant (shared persistence choice explicit), d) independently instantiated NPC with private state. Each has distinct identity, performance and multiplayer semantics.
- Observer interest sets use location/region/party/instance + quest flags, and re-evaluate when quest state or membership changes; invalidate cached projections atomically. No global scan per command for all entities/players.
- Phase precedence/conflicts must be explicit: quest states vs world events vs GM overrides vs party sync, default/empty/invalid rule, post-completion visibility. Missing rules do not silently make entities visible.
- If player A sees Joe and B does not, B must not discover Joe by guessed ID, interaction text, inventory leaks, target completion or other player's dialogue/narration.

## Private instancing vs shared phasing
- Phasing preserves one shared world/location/entity state and filters each observer; different viewers may see different NPCs/objects/description while co-located.
- Instancing creates a separately authoritative ECS subset/location graph with unique instance ID; encounters, doors, loot, NPCs and progression belong to that instance (or explicitly share selected world state).
- Entry/exit portals, party membership, character move between instances, persistence, creation/rejoin, disconnect/cleanup, concurrency and limits need a designed contract.
- Party policies include solo private, party-owner, party-leader, synchronized compatible progression, independent progress in shared instance, replay/matchmaking, locked-out, spectator and GM. Creator chooses enabled policies; default behavior requires ADR.
- Never confuse editor's map grid/layer with world instance: one map asset can back many live instances, each with distinct ECS IDs.

## Multiplayer correctness and concurrency
All quest-state transitions and rewards are authoritative, atomic and idempotent per event/attempt. Interaction reads a committed snapshot of NPC availability, actor quest progress and phase; if state changes between request and execution, recompute or reject. Joe must not become interactable for a stale player just because cached client still displays him.
- No double-granted rewards on reconnect, command retry, event replay or duplicate contact.
- Completing Talk to Bob invalidates visibility and NPC-dialogue projections for the owner atomically or under a consistent revision barrier. Clients receive updates only after commit.
- If two players use shared NPC dialogue concurrently, each sees own branch and owns own quest progress; avoid per-NPC shared mutable `current dialogue` pointer unless explicitly shared.
- When party members have mismatched quest phases, engine enforces declared party experience policy; no invisible party member / teleporter surprise without creator-visible validation.
- Quest definition upgrades pin in-progress attempts to known version or run explicit migration. Removed NPC/quest objective cannot strand players silently: detect reachability and migration impact before publish.

## Performance and observability
Index subscriptions by event type/quest and actor scope, index phase eligibility by location and dependency flag, cache player-view with revision dependencies and invalidate on specific quest/region/instance changes; benchmark with representative players, objectives, phased entities and simultaneous party transitions. Logs/trace capture reason Joe was hidden, dialogue chosen, event objective credited, reward claimed, phase recomputed, without leaking private decisions to another player. All thresholds config+benchmarked, not invented.

## Acceptance contract
See [Bob/Joe scenario](../04-features/bob-joe-quest-scenario.md) for exhaustive state matrix and [quest condition/dialogue contract](../03-contracts/quest-conditions-and-dialogue.md) for typed APIs. No quest system implementation is complete until plain-language editor can author this without code and a real multiplayer runtime obeys phase filtering.
