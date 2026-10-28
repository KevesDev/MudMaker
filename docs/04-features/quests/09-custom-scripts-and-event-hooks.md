# 09 | Custom Quest Scripts, Hook Overrides, Dialogue Challenges and World Events

**Status:** User-confirmed custom scripting throughout quest lifecycle REQUIRED. Canonical callback IDs, typed event/effect ordering and C# worker/graph security governed by the versioned scripting-v1 source contracts; runtime dispatch pending. **Authority:** Quest Hook Registry + typed Graph/Script Adapter + ECS Command Executor; no independent quest scripting engine. **Related:** [dialogue stages](04-dialogue-stages.md), [objective credit](02-objective-catalog-and-credit.md), [rewards](05-rewards-and-loot.md), [world events](../../02-architecture/time-events-world-systems.md), [engine script contract](../../03-contracts/scripting-and-graph.md).

## Fundamental requirement
A creator can attach a no-code graph, typed custom script or combination of both to **any quest lifecycle stage, objective, quest NPC interaction, reward, chain transition or world-system event**. Creator can extend default behavior, conditionally replace it, or handle the stage entirely through a custom workflow. No forced reward, forced quest completion or fixed dialogue script. Scripting is fully optional for typical quests, but advanced creators can implement novel mechanics without forking the engine.

**Scripts may change authorized gameplay behavior, not the ownership or validation mechanisms.** Scripts never directly write ECS component storage, player inventory, world event state or quest progress. They call the same capability-limited transaction/action APIs as built-in graph nodes. An override does not turn off authorization, phasing, phase-specific NPC targetability, reward idempotency, or durable world consistency.

## One hook abstraction for every entrypoint
A **HookBinding** is an authored, versioned asset with: bindingId, owner asset ID+version (quest/step/NPC/Blueprint/dialogue/reward/chain), HookPoint enum, matching typed event or stage, guard (shared Condition Registry), scope/actor/target, priority/conflict policy, mode, handler asset (graph ID or script ID), allowed capability/read/write manifest, max execution budget reference, failure policy, logging/trace settings, and enable/disable.
A **HookInvocation** is a validated immutable context: world+instance ID/revision, request/correlation ID, quest definition+attempt/owner scope+revision, actor+target IDs, interaction location, current objective/chain state, dialogue session+node (when relevant), typed event payload, relevant approved ECS reads, origin/source, and deterministic world clock/RNG capability.
A **HookDecision** (canonical typed result) must be one of: ContinueDefault; ReplaceText/DialogueBranch with validated asset; ProposeEffects (ordered validated command actions); Veto/Reject with safe reason; DeferToChoice with durable workflow/session ID; SuppressOptionalNarration; or a documented composite **before commit**. Never accept arbitrary string return values as authoritative action names, raw SQL, or direct component memory pointers.

### Hook execution modes (user-facing)
- **Before default (add conditions):** run validation/choice/script, then normal stage; can reject or defer before any commit.
- **After default (additional action):** on committed transition, enqueue durable typed follow-up action; failure cannot retroactively claim previous commit rolled back. Show actual status.
- **Replace default:** do NOT automatically execute the stage's normal dialogue, completion, reward or next quest. The custom handler must declare exactly which lifecycle result and effects it commits (e.g., complete quest without reward, remain active and start event, complete and open next quest). Disallow silent success/no-op.
- **Conditional override:** if a typed predicate matches use custom path, else run normal path. Guard always rechecked at authoritative commit time.
- **Both default + custom:** creator chooses ordering and atomicity semantics. Where effects must succeed or fail together, include both in one validated transaction; long-running/external actions use durable outbox/saga with explicit pending/failure state.
- **Presentation only:** change line, choices, quiz, preview or observer narration without quest progression; requires no mutation capability.

## Full hook point inventory — not only OnComplete
| Owner/stage | Before / after / replacement supported | Typical creator uses |
|---|---|---|
| Offer eligibility / discovery | OnOfferCheck, OnDiscovered, OnOfferDisplayed | Name/class/flag predicate, secret unlock, alternative offer text |
| Pre-quest dialogue | OnBeforeDialogue, OnGenericInteract | Random reaction, scripted challenge, world greeting |
| Offer dialogue | OnOfferOpen, OnOfferResponse | Conditional offer or quiz, alternative quest, schedule event |
| Confirmation | OnBeforeAccept, OnAccepted, OnDeclined | Charge item, choice confirmation, set flag, start event |
| In-progress interaction / dialogue | OnInteract, OnDialogueNode, OnDialogueChoice | Quest-active NPC event, quiz, dialogue side effect, trigger machines |
| Reminder/status | OnProgressViewed, OnReminder | Dynamic clue/event state, alternative lines, no automatic progress |
| Objective lifecycle | OnObjectiveAvailable, OnObjectiveCredited, OnObjectiveSatisfied, OnObjectiveFailed | Increment typed progress, route branch, world event starts/stops |
| Quest turn-in | OnBeforeTurnIn, OnTurnInCommitted, OnTurnInRejected | End an event instead of normal reward, do both, delay until question answered |
| Completion | OnBeforeComplete, OnCompleted | Grant special reward, start follow-up, change world phase |
| Reward handling | OnRewardEligible, OnRewardOptions, OnBeforeClaim, OnRewardClaimed, OnRewardRejected | Script-generated eligible options, name-based grants, custom reward action |
| Post-quest | OnAfterDialogue, OnReplayRequested | Reminder of next part, new interaction, reoffer, conditional world NPC |
| Exception lifecycle | OnFailed, OnAbandoned, OnExpired, OnReset, OnSuspended, OnResumed | End escort event, return quest item, custom retry |
| Quest chain | OnBranchEvaluated, OnNextOffered, OnNextAccepted | Delayed next quest, conditional alternate branch, world event milestone |
| NPC/object interaction | OnInteractAttempt, OnInteractionCommitted, OnInteractionDenied | NPC script only while a named quest active; scripted item/door action |
| World event lifecycle | OnEventStartRequested, OnEventStarted, OnEventStopRequested, OnEventStopped | Spawn regions, change weather, activate encounter, clean up scheduled effects |

The display names in this table describe author-facing lifecycle stages, not alternate executable method names. **Only exact IDs in** `contracts/scripting/v1/hooks.v1.json` **are executable bindings**. Each row maps to the typed registered hook family/phase for that lifecycle; if a listed stage lacks a literal ID, the S13 Builder must add it atomically across registry, CLR, Proto and graph catalog before the feature is considered delivered. Never create a parallel dispatcher.

## Example A — Name-based reward
Creator: "When event X occurs, reward eligible characters whose names begin with A."
- Eligibility is an actor-scoped predicate, not a global sweep unless creator selected world-wide recipient search and has the capability.
- Standard no-code Condition Registry may expose "Character display name begins with" (name source, normalization and case-sensitivity specified), and a script may compute the same result from an authorized read-only character name field.
- Script returns a typed **GrantReward** action or a typed reward plan reference, with declared actor/recipient scope and one-time event key. The server checks recipient ownership, eligibility and reward limits; no script can award an unrelated offline account without explicit capability.
- State what "name" means (display character name, role-play alias, account name, normalized legal identity). Default should **not** silently use account identity; name changes/replay policy must be configured. International Unicode, casefold, leading spaces and duplicate display names are explicit predicate semantics.
- Successful committed reward produces player/observer messages only under configured narration; a failed condition produces no grant and no fake success text.

## Example B — Scripted multiple-choice quiz
A quest interaction triggers script/graph handler to open a multiple-choice question with 3+ options; creator marks answer(s), partial credit, retry limit, timing and outcome rules. Option order can be randomized with server-owned RNG. The player clicks answer choice; server checks correct choice against private authoritative data, *not* client-submitted "correct=true".
- The dialogue/quiz is a **durable per-character conversation workflow** with session/node ID and revision, not a modal that can claim quest progress locally.
- A correct answer may credit objective, grant item, start event or branch quest; wrong answer may show feedback, repeat, fail, cost an item, or do nothing depending on explicit creator policy.
- Interruption, disconnect, timer expiry, reload, two simultaneous devices, answer replay, shuffled order, localization and inaccessible choice must be defined. Client receives only available answer text/opaque choice IDs and no secret answer flag.
- The same question can be authored with visual Dialogue/Quiz nodes or custom script via identical API and security checks.

## Example C — NPC interaction only while quest active
At Bob's NPC Blueprint, attach OnInteract with condition "Quest: Talk to Bob is Active." Binding can emit a custom typed event, set allowed world flag, start a regional NPC spawner, display special dialogue or run a safe script. When inactive, the default generic dialogue still runs or an alternative condition chooses different script. Running the NPC interaction does **not** automatically complete the quest unless the author adds a specific validated quest action.
- Ownership: NPC interaction broker resolves one handler registry; condition evaluator reads per-actor quest state; script dispatcher executes bound asset; ECS transaction mutates; typed event/narration projects to authorized nearby players.
- Multiple players talk to Bob simultaneously with isolated quest state and script session; no mutable shared "current NPC quest" state.

## Example D — Turn-in starts, ends or replaces a world event
Creator choices: "On turn-in, start festival"; "On turn-in, stop storm"; "On turn-in, start festival AND give normal reward"; "Instead of completing, launch multi-step event and require a later return".
- World events are **durable typed world-system instances** with eventId, owning world/region/party scope, lifecycle NotStarted/Starting/Active/Stopping/Ended/Failed (PROPOSED), permissions, schedule/instance links and deduplication key.
- Starting/ending is a validated request to the World System/Event Manager, not arbitrary direct toggling of a local boolean or killing process; a running event may own weather state, NPC waves, spawners or timers. Stop invokes defined cleanup/restore, including restart/crash recovery.
- If turn-in is coupled to the event transition, author selects **atomic if same ECS transaction** or **pending durable workflow if asynchronous**. The quest must not be marked completed with a promised-but-lost world event without an explicit policy.
- "Replace default" can omit typical XP/item/chain effects *only because the creator explicitly specified that outcome*. UI previews player journal status and any continuing quest. "Run both" preserves exactly-once default reward plus exactly-once scripted event, not two reward grants.
- OnEventEnded may then offer new quest, phase in Joe or schedule another event. Prevent self-triggering recursive events via bounded event cascade and causation trace.

## Example E — Custom response changes quest branch
A script can offer a multi-choice dialogue where selecting the correct answer grants "Find Joe" while wrong answer offers an alternative investigation; it returns typed branch/offer actions. The engine still owns prerequisite/exclusive branch checks and quest attempt creation. A custom script cannot fake a prior "QuestRewarded" state without executing the actual validated lifecycle action.

## Cross-stage design and consistency invariants
1. **Exactly one owner:** Hook Registry coordinates, Dialogue presents, Quest Progress validates, Reward Planner grants, Event/World Manager runs world event, ECS executor commits. Never a separate raw "quest script mutation" manager.
2. **Guard at execution:** visibility, class/level, name prefix and quest progress are checked on server, not only editor/GUI preview. Stale client choice cannot bypass.
3. **Atomic before / durable after:** before hooks may propose effects/veto before commit; after hooks consume committed facts and schedule durable effects with clear success/failure. Never pretend arbitrary asynchronous external I/O is part of an ECS transaction.
4. **Idempotence and ordering:** hook invocation, answer attempts, reward grant, event start/stop and next quest are keyed and deduplicated across retries/replay/restart; ordered per relevant world/quest revision.
5. **Scope and cost:** expensive recipient queries must be bounded/indexed and scheduled, not scanning every online player each game tick. Script time/memory/read/command budget and output size are named/configured/measured.
6. **Failures:** missing script, compilation failure, deadline or denied capability produces explicit creator-facing diagnostic and player-safe error. **Security/permission/quest mutations fail closed**; optional cosmetic fallback may be explicitly chosen by creator, with trace. A failed required hook cannot be silently skipped to mark quest complete.
7. **Versioning:** bindings pin script/graph/schema version and persist in quest/package; hot reload compiles/validates before swap and never changes a running conversation's semantics without compatible migration.
8. **Visibility:** quiz choices, hidden quest details and identity-based rewards cannot leak via observer narration, global event subscriptions, logs exposed to players or projection of private component fields.
9. **No speculative capabilities:** scripting language is C# 14/.NET 10 in a bounded host-local worker; cross-world writes are denied; examples express behavior, not technology approval.

## No-code and advanced visual authoring
For every quest/dialogue stage, objective, NPC interaction and reward, show **When this happens...** with options **Use normal behavior**, **Run an action first**, **Run an action afterward**, **Replace normal behavior**, **Only if...**, **Ask player a question**, **Run a visual graph**, **Run a custom script**.
Use rule builder for "Name starts with A"; typed choices editor with mark-correct (kept private), score/retry configuration; action palette for **Grant Reward**, **Start World Event**, **Stop World Event**, **Advance Quest**, **Offer Follow-up**, **Run Default and Custom**. Give an **Effects Preview** showing selected quest lifecycle result, recipients, rewards, world event states and when actions commit. Advanced scripts attach as versioned assets with required capability checklist and exact signature; authoring validation detects unresolved callbacks, missing fallback, forbidden capability, infinite graph cycle, invalid event targets and ambiguous execution order.
Creator can attach a script to Bob in map cell inspector or to the quest dialogue/turn-in tab and both open **the same binding asset**. No hidden two-copy configuration.

## Acceptance / independent test oracles
- HOOK-01: character display name prefix A receives exactly one reward after approved event, different name receives none; changed name/Unicode follows configured policy, not client-supplied claim.
- HOOK-02: script or graph opens 3-choice question; correct answer commits objective and emits correct narration, wrong answer follows configured branch, hidden answer never in client payload; duplicate response/reconnect no repeat reward.
- HOOK-03: Bob script runs only while actor's Q1 active and emits configured typed event; inactive Bob generic dialogue unaffected, two players have isolated behavior.
- HOOK-04: on turn-in, start event instead of normal reward; quest lifecycle reflects author-selected replace mode; no XP/item falsely awarded.
- HOOK-05: turn-in default reward AND start event exactly once, on retry/restart no duplicate of either; if event start fails, prescribed atomic/pending recovery policy proves no lost state.
- HOOK-06: completing another quest stops a previously started world event and cleans up spawners/weather; a restart mid-event restores valid lifecycle.
- HOOK-07: pre-hook can veto or defer; no quest state/reward/observer success event until committed; post-hook cannot retroactively change committed action.
- HOOK-08: visually configured conditional override chooses either script/custom or normal branch as designed, survives save/reopen/publish, works on real tablet/desktop controls.
- HOOK-09: untrusted script denied filesystem/network/foreign-world/private-player access, runaway events/budgets bounded and audited, no ghost event.
- HOOK-10: independent test proves that simply omitting script callback does NOT yield a fake PASS/quest completion, and scripted event's target state actually changed.

Test real ECS quest, event state, dialogue session, inventory/reward receipt and per-client observer messages; printing "festival started" or modal "correct" without authoritative state does not pass. Tests/acceptance must not duplicate identical permutations just to inflate counts.

## Open architecture decisions
HOOK-ABI node names and phase ordering, before/after effect-plan representation, atomic vs durable outbox semantics, failure/fallback requirements, script execution limits and sandbox, name normalization/source, quiz retry/session lifetime/answer secrecy, world event lifecycle and scoped recipients. See [ADR register](../../02-architecture/architecture-decisions.md). No agent guesses final values or skips scenarios.

## Current exact hook names
For implementation, **use** [scripting v1 hook registry](../../03-contracts/scripting-v1/03-hook-registry.md) and [SDK source contracts](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs). Earlier prose and examples here remain requirement/behavior examples, not alternative hook signatures. Only local host-published code can bind these; player input cannot select arbitrary handler names.
