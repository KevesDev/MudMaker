# 03 — Hook Registry v1: Canonical IDs and Typed Events

**Authority:** [hooks.v1.json](../../../contracts/scripting/v1/hooks.v1.json) is the canonical machine-readable hook registry, and this table is the human-readable mirror. Host-created local releases own every registered binding; a remote player cannot supply hook names or script code. SDK `[MudHook]` strings must match exactly. Event classes are in [Contracts.cs](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs). Status: decided v1 interface, not implemented.

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

## Evennia coverage: exact additional v1 hook contracts (runtime pending)

The complete [Evennia-to-MudMaker source map](../../08-research/evennia-hook-parity/INDEX.md) covers 108 upstream methods, resolving to 89 unique target IDs. The JSON registry is the canonical machine contract; this section is the human-readable additional set. **Every row has a defined CLR event/result signature; no row is yet a functioning native host callback.** Query hooks return `HookQueryResult` and cannot emit effects.

| Exact ID | Phase | CLR event | Return | Host owner |
|---|---|---|---|---|
| `entity.copied.after` | After | `EntityLifecycleHookEvent` | `HookDecision` | Entity |
| `entity.appearance.format.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `entity.appearance.resolve.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `entity.created.after` | After | `EntityLifecycleHookEvent` | `HookDecision` | Entity |
| `entity.initialized.after` | After | `EntityLifecycleHookEvent` | `HookDecision` | Entity |
| `entity.delete.before` | Before | `EntityLifecycleHookEvent` | `HookDecision` | Entity |
| `entity.prototype.applied.after` | After | `EntityLifecycleHookEvent` | `HookDecision` | Entity |
| `entity.hydrated.after` | After | `EntityLifecycleHookEvent` | `HookDecision` | Entity |
| `command.available.query` | Query | `QueryHookEvent` | `HookQueryResult` | Command |
| `character.control.before` | Before | `AccountHookEvent` | `HookDecision` | Entity |
| `character.control.after` | After | `AccountHookEvent` | `HookDecision` | Entity |
| `character.release.before` | Before | `AccountHookEvent` | `HookDecision` | Entity |
| `character.release.after` | After | `AccountHookEvent` | `HookDecision` | Entity |
| `host.stopping.before` | Before | `HostHookEvent` | `HookDecision` | Host |
| `access.checked.after` | After | `AccessHookEvent` | `HookDecision` | Access |
| `entity.move.before` | Before | `MovementHookEvent` | `HookDecision` | Entity |
| `container.leave.before` | Before | `MovementHookEvent` | `HookDecision` | Container |
| `container.receive.before` | Before | `MovementHookEvent` | `HookDecision` | Container |
| `narration.move.origin.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Narration |
| `narration.move.destination.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Narration |
| `container.leave.after` | After | `MovementHookEvent` | `HookDecision` | Container |
| `container.receive.after` | After | `MovementHookEvent` | `HookDecision` | Container |
| `exit.traverse.failed.after` | After | `MovementHookEvent` | `HookDecision` | Exit |
| `message.receive.before` | Before | `ChannelHookEvent` | `HookDecision` | Channel |
| `message.send.before` | Before | `ChannelHookEvent` | `HookDecision` | Channel |
| `entity.look.after` | After | `EntityLifecycleHookEvent` | `HookDecision` | Entity |
| `entity.description.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `item.drop.before` | Before | `ItemEvent` | `HookDecision` | Item |
| `item.drop.after` | After | `ItemEvent` | `HookDecision` | Item |
| `chat.say.before` | Before | `ChannelHookEvent` | `HookDecision` | Channel |
| `chat.say.after` | After | `ChannelHookEvent` | `HookDecision` | Channel |
| `entity.renamed.after` | After | `EntityLifecycleHookEvent` | `HookDecision` | Entity |
| `account.character.assigned.after` | After | `AccountHookEvent` | `HookDecision` | Account |
| `account.character.unassigned.after` | After | `AccountHookEvent` | `HookDecision` | Account |
| `character.created.after` | After | `AccountHookEvent` | `HookDecision` | Entity |
| `channel.recipient.before` | Before | `ChannelHookEvent` | `HookDecision` | Channel |
| `channel.recipient.after` | After | `ChannelHookEvent` | `HookDecision` | Channel |
| `account.created.after` | After | `AccountHookEvent` | `HookDecision` | Account |
| `account.hydrated.after` | After | `AccountHookEvent` | `HookDecision` | Account |
| `account.first_login.after` | After | `AccountHookEvent` | `HookDecision` | Account |
| `account.credentials.changed.after` | After | `AccountHookEvent` | `HookDecision` | Account |
| `account.login.before` | Before | `AccountHookEvent` | `HookDecision` | Account |
| `account.login.after` | After | `AccountHookEvent` | `HookDecision` | Account |
| `account.login.failed.after` | After | `AccountHookEvent` | `HookDecision` | Account |
| `account.disconnect.before` | Before | `AccountHookEvent` | `HookDecision` | Account |
| `account.disconnect.after` | After | `AccountHookEvent` | `HookDecision` | Account |
| `scheduler.job.created.after` | After | `ScheduleHookEvent` | `HookDecision` | Scheduler |
| `scheduler.job.hydrated.after` | After | `ScheduleHookEvent` | `HookDecision` | Scheduler |
| `scheduler.job.delete.before` | Before | `ScheduleHookEvent` | `HookDecision` | Scheduler |
| `scheduler.job.validity.query` | Query | `QueryHookEvent` | `HookQueryResult` | Scheduler |
| `scheduler.job.started.after` | After | `ScheduleHookEvent` | `HookDecision` | Scheduler |
| `scheduler.job.paused.after` | After | `ScheduleHookEvent` | `HookDecision` | Scheduler |
| `scheduler.job.stopped.after` | After | `ScheduleHookEvent` | `HookDecision` | Scheduler |
| `host.started.after` | After | `HostHookEvent` | `HookDecision` | Host |
| `channel.created.after` | After | `ChannelHookEvent` | `HookDecision` | Channel |
| `channel.prefix.query` | Query | `QueryHookEvent` | `HookQueryResult` | Channel |
| `channel.message.before` | Before | `ChannelHookEvent` | `HookDecision` | Channel |
| `channel.message.after` | After | `ChannelHookEvent` | `HookDecision` | Channel |
| `channel.member.join.before` | Before | `ChannelHookEvent` | `HookDecision` | Channel |
| `channel.member.join.after` | After | `ChannelHookEvent` | `HookDecision` | Channel |
| `channel.member.leave.before` | Before | `ChannelHookEvent` | `HookDecision` | Channel |
| `channel.member.leave.after` | After | `ChannelHookEvent` | `HookDecision` | Channel |
| `channel.hydrated.after` | After | `ChannelHookEvent` | `HookDecision` | Channel |
| `channel.senders.format.query` | Query | `ChannelHookEvent` | `HookQueryResult` | Channel |
| `channel.external.format.query` | Query | `ChannelHookEvent` | `HookQueryResult` | Channel |
| `channel.message.format.query` | Query | `ChannelHookEvent` | `HookQueryResult` | Channel |
| `command.execute.before` | Before | `CommandHookEvent` | `HookDecision` | Command |
| `command.execute.after` | After | `CommandHookEvent` | `HookDecision` | Command |
| `command.parse.query` | Query | `CommandHookEvent` | `HookQueryResult` | Command |
| `command.set.created.after` | After | `CommandHookEvent` | `HookDecision` | Command |
| `session.synchronized.after` | After | `AccountHookEvent` | `HookDecision` | Session |
| `session.login.after` | After | `AccountHookEvent` | `HookDecision` | Session |
| `session.disconnect.after` | After | `AccountHookEvent` | `HookDecision` | Session |

| `entity.appearance.name.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `entity.appearance.numbered_name.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `entity.appearance.header.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `entity.appearance.desc.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `entity.appearance.exits.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `entity.appearance.characters.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `entity.appearance.things.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |
| `entity.appearance.footer.query` | Query | `PresentationQueryEvent` | `HookQueryResult` | Entity |

For each ID: `[MudHook("entity.copied.after")] public HookDecision Method(HookContext ctx, EntityLifecycleHookEvent e)` illustrates the **signature format** only; substitute the ID/type/return from that exact row. Source-level family examples: [code sample index](../../../examples/scripting/hook-families/README.md). Native hook dispatch must match these types and reject incorrect bindings, phase or result types. All scripts are installed by the local host, never uploaded by connected players.

## Planned account/character lifecycle hook extension (not registered)

[Account/character lifecycle contract](../account-character-lifecycle.md) specifies canonical lifecycle coverage and an Evennia-method comparison. Existing `player.login.after` and `player.logout.after` **already exist**; their exact session/account meaning and compatibility must be resolved before adding overlapping event IDs. Proposed new account, session, character puppet and creation workflow hooks are **not valid v1 bindings** until the canonical `hooks.v1.json`, `Contracts.cs`, Protobuf wire, typed SDK methods, catalog examples and security tests are versioned in one reviewed change. No credentials, secret auth fields or client-selected AccountId may reach a creator callback. Auth, ownership and host permission invariants are never cancellable by scripts. S13.14–15 owns the ABI integration; S14.8 exercises the finalized contract.

## Optional nearby NPC speech extension (not registered)

[Local NPC dialogue contract](../optional-local-npc-dialogue.md) proposes triggering on observer-authorized nearby speech/visible world events. Existing NPC interaction hooks remain valid; new 'heard speech' hooks are **not** registered in v1 and must receive exact typed event, visibility guarantees, binding owner, JSON/CLR/Protobuf parity and audited permission tests before use. A generated response is a proposed NPC utterance, not a script command or world mutation. S07.20 is the first native host dialogue gate; S13.16 implements typed C# hook integration after registry/CLR/Protobuf review.

## Combat and inventory hook registrations — binding source contracts

[Combat contract](../combat-and-encounters.md#registered-combat-source-contract--canonical-hook-ids) contains all exact combat hook IDs and dispatch rules. `contracts/scripting/v1/hooks.v1.json` registers 58 combat lifecycle hooks as `CombatLifecycleEvent` with C# and Protobuf counterparts, plus three participant connection-state hooks using `CombatControlEvent`. [Inventory contract](../inventory-and-containers.md#canonical-inventory-hooks-and-graph-actions) defines 25 exact transfer/container/equipment/trade hook IDs, mapped to `InventoryTransferEvent`, `InventoryContainerEvent`, `InventoryEquipmentEvent` and `InventoryTradeEvent` in the same source contracts. Each family also has typed native-validated proposal effect DTOs. All remain `runtimeImplemented: false` until actual implementation and independent audit.

These names and payloads are **canonical**, not suggestions to be selected during a Builder sprint. The S13.17–20 phases implement native dispatch, script worker bindings, graph port catalog, validated effect routing, host recovery, custom CombatManager instances and inventory scripting. The host controls account/session authority, object custody, visibility, timer scheduling and encounter/transaction commits; neither C# nor graph callbacks may bypass native checks. Before callbacks may only veto or propose permitted validated effects, after callbacks may only enqueue independent effects, and query callbacks are pure. Run identical negative/positive scenarios against C#, graphs and the Player/Creator UI.

## LOOK and perception source-level hooks

The [LOOK contract](../look-and-perception.md#6-creator-authoring-and-first-class-scripting) names the exact existing `entity.appearance.*` and `entity.look.after` hooks and seven additional registered `look.*` hooks. `look.target.resolve.query`, `look.perception.query`, `look.detail.query`, `look.contents.query`, `look.examine.query` use `LookQueryEvent` and the existing pure `HookQueryResult` response. `look.requested.after` and `look.completed.after` use `LookObservedEvent` with `HookDecision` limited to independently validated follow-up work. Matching `HookEvent` Protobuf oneof fields 32–33 are source-defined. None implies the runtime is implemented before S13.21 and audited dispatch. Visibility always precedes queries; C# cannot grant access to hidden objects.
