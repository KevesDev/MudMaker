# 03 — Hook Registry v1: Canonical IDs and Typed Events

**Authority:** This table is the **only** source of registered creator-facing hook IDs. Host-created local releases own every registered binding; a remote player cannot supply hook names or script code. SDK `[MudHook]` strings must match exactly. Event classes are in [Contracts.cs](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs). Status: decided v1 interface, not implemented.

## Registry and typed event mapping
Each listed pair is **one v1 hook ID**, not an English suggestion. `before` is cancel/replace/append/defer where permitted, `after` is read-only with independently queued effects only. Platform-originated facts cannot be forged by clients or creator code.

| Exact Hook ID | Event type | Binding owners / when |
|---|---|---|
| `npc.interact.before` | `NpcInteractEvent` | NPC/Blueprint before a validated interaction |
| `npc.interact.after` | `NpcInteractEvent` | NPC/Blueprint after successful interaction |
| `dialogue.choice.before` | `DialogueChoiceEvent` | Dialogue node/NPC before valid choice commit |
| `dialogue.choice.after` | `DialogueChoiceEvent` | Dialogue node/NPC after choice commit |
| `quiz.evaluated.before` | `QuizEvaluatedEvent` | Question set before quiz outcome recording; fact is server evaluated |
| `quiz.evaluated.after` | `QuizEvaluatedEvent` | After answer outcome committed |
| `quest.offer.before` | `QuestLifecycleEvent` | Quest before Offered |
| `quest.accept.before` | `QuestLifecycleEvent` | Quest before Active |
| `quest.accept.after` | `QuestLifecycleEvent` | Quest after Active |
| `quest.objective.credit.before` | `ObjectiveCreditEvent` | Quest/objective before validated credit |
| `quest.objective.credit.after` | `ObjectiveCreditEvent` | Quest/objective after credited |
| `quest.turn_in.before` | `QuestTurnInEvent` | Quest + turn-in target before complete/reward |
| `quest.turn_in.after` | `QuestTurnInEvent` | After turn-in committed |
| `quest.completed.after` | `QuestLifecycleEvent` | Completed fact, not a second completion request |
| `quest.fail.before` | `QuestLifecycleEvent` | Quest before Failed |
| `quest.fail.after` | `QuestLifecycleEvent` | Quest after Failed |
| `quest.abandon.before` | `QuestLifecycleEvent` | Quest before Abandoned |
| `quest.abandon.after` | `QuestLifecycleEvent` | Quest after Abandoned |
| `quest.reset.before` | `QuestLifecycleEvent` | Repeat-cycle/quest attempt reset |
| `quest.reset.after` | `QuestLifecycleEvent` | After new attempt created |
| `quest.reward.claim.before` | `RewardClaimEvent` | Reward claim before persisted grant |
| `quest.reward.claim.after` | `RewardClaimEvent` | After persisted grant |
| `exit.traverse.before` | `EntityMoveEvent` | Exit before source/destination validation and movement |
| `exit.traverse.after` | `EntityMoveEvent` | Exit after movement committed |
| `entity.move.after` | `EntityMoveEvent` | Any committed location transfer |
| `transit.departed.after` | `TransitEvent` | Vehicle left station; world-authored event |
| `transit.arrived.after` | `TransitEvent` | Vehicle docked; world-authored event |
| `world_event.started.after` | `WorldEventLifecycleEvent` | Global/region lifecycle committed |
| `world_event.stopped.after` | `WorldEventLifecycleEvent` | Event stop committed |
| `item.use.before` | `ItemEvent` | Item use with authorized actor/target |
| `item.use.after` | `ItemEvent` | Item use committed |
| `item.pickup.before` | `ItemEvent` | Transfer to inventory before |
| `item.pickup.after` | `ItemEvent` | Transfer committed |
| `item.transfer.before` | `ItemEvent` | Item trade/give/transfer |
| `item.transfer.after` | `ItemEvent` | After ownership/containment transfer |
| `entity.spawn.after` | `EntityLifecycleEvent` | Spawn fact committed, with entity+prototype refs |
| `entity.despawn.after` | `EntityLifecycleEvent` | Despawn fact committed, no mutable entity access after removal |
| `timer.fired.after` | `TimerFiredEvent` | Durable occurrence; no timer thread in script |
| `player.login.after` | `PlayerSessionEvent` | Authenticated session begins; no trust of client payload |
| `player.logout.after` | `PlayerSessionEvent` | Authenticated session ends |

**Versioning:** This table is the registered hook set for v1. Every new hook needs a typed event, binding-owner policy and matching wire case; publish rejects unknown IDs. No generic arbitrary client-selected hook callback.

## HookBinding serialization v1 (logical fields)
`bindingId: Guid; ownerAsset: AssetRef; hookId: catalog string; boundTarget?: EntityRef or BlueprintRef; scriptAsset: AssetRef; moduleId: string; methodName: string; phase: HookPhase; mode: one of permitted dispositions; conditionAsset?: AssetRef; priority: int; capabilityIds: immutable set; failurePolicy: RejectOrContinueBySpec; enabled: bool; releaseHash: content hash`.

Publish must verify: hook ID exists; event type matches method signature; binding owner/target type permitted; mode matches phase; asset GUIDs resolve; granted capabilities are a subset of world owner's permissions and published module manifest; conflicting terminal handlers rejected; security policy and resource budget assigned.

## Engine event source vs creator hook
Flecs `OnAdd`, `OnSet`, `OnRemove` and observers fire around ECS component changes; they **must not** be exposed as creator hook IDs or used to send player narration directly. Game-level hooks are generated from **authenticated and validated typed domain commands/events**. If the ECS adapter swaps library, the creator hook ABI must not change.

## Ordering / recursion / phase
1. Gateway authenticates and resolves actor, target, source, phase and preconditions.
2. World locks/epochs relevant state and constructs filtered snapshot + hook list from the pinned release.
3. Before handlers run in deterministic priority order; terminal outcomes handled under declared conflict policy. No previously applied partial mutation while waiting on scripts.
4. World revalidates dependency versions, authorizations and effect preconditions; commits built-in action plus optional effects atomically with event/outbox; phase and quest credit do not bypass default checks.
5. After handlers receive immutable committed facts and may enqueue separately authorized durable commands. Recursion and event fanout must be bounded; reentrant hook loops are rejected/logged.
6. Explicit choices and timers resume in new commands, never in ambient C# memory.

## More specific extension points
Before adding a hook for region enter/leave, combat, inventory/crafting, scheduled weather, spawner onCreate, party/instance, command parser or custom creator-defined domain event: define **exact typed payload**, authority, audience, effects, failure semantics, and independent tests. "Any lifecycle" in the feature vision means these categories must be covered as implemented, **not** that invented generic `OnAnything` callbacks ship silently. Extension hook catalog requires v2 or additive reviewed v1 minor revision.
