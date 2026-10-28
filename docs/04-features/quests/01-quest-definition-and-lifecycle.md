# 01 | Quest Definition, Data Model and Lifecycle

**Status:** REQUIRED extensibility, PROPOSED detailed schema. **Owner:** Quest Definition Registry and ECS QuestProgress System. **Read with:** [runtime architecture](../../02-architecture/quest-progression-and-phasing.md) only if implementing. **Do not duplicate** reward rules, objective semantics, dialogue or phase policies here; use linked subtabs.

## Quest is not a subclass per type
"Escort quest", "daily quest", "class quest", "world quest" and "main story" describe different dimensions: objective, recurrence, eligibility, scope and presentation category. One quest can be a daily class-specific escort with optional collection, a randomized reward and a world phase change. A rigid `QuestType` enum cannot express this. Registry is extensible through typed objective/action/condition providers and shared ECS services.

## Proposed saved QuestDefinition fields, every field explicit
| Area | Field / contract |
|---|---|
| Identity | stable namespaced QuestId; version; title; localized description; category/tags; creator ownership; content package; assets/dependency versions |
| Discovery/presentation | icon/color, difficulty/importance, quest-log/tracker visibility, spoiler/hidden policy, map marker/waypoint hints, journal text, optional recommended level/party size |
| Offer source | one or more NPCs/objects/locations/events/automatic discovery triggers; source priority; start-dialogue binding; fallback if source destroyed/unavailable |
| Eligibility | typed condition tree: class/role, level, subclass/specialization, race/species, faction, skill, reputation, party, world phase, prior quest flags, active/exclusive conflicts, times/season |
| Accept policy | manual offer+accept vs auto-accept vs auto-start-on-event, option to decline, visibility of offer to ineligible actors, optional starter item/buff, confirmation |
| Participation/owner | per-character, per-account, party, guild, world, region, private instance, or custom documented scope; event attribution + sharing rules |
| Objectives | versioned directed objective graph and completion logic (AND/OR/ordered/optional/hidden/conditional, counter and timer semantics); see [02](02-objective-catalog-and-credit.md) |
| Progression | lifecycle state, initial conditions, on accept/advance/complete/fail/abandon/expire/turn-in callbacks, source of authority, event idempotency |
| Dialogue | phase-specific dialogue bindings and per-actor conversation state; see [04](04-dialogue-stages.md) |
| Chains | prerequisite/dependency expression, next quest(s), optional branches/exclusive groups, auto-grant or offer, replay/repeat semantics; see [03](03-chains-and-dependencies.md) |
| Rewards | guaranteed/choice/chance/group, eligibility and visibility policies, item/currency/XP/unlocks/reputation/script effects, grant/claim timing; see [05](05-rewards-and-loot.md) |
| World effects | start/step/failure/completion/reward actions: NPC phase changes, exits, weather, spawners, global flags, private encounter creation, announcements, track/vehicle state |
| Recurrence | once, repeatable, daily/weekly, cooldown, event/season/window, per-attempt/reset period, account/character restrictions |
| Failure/recovery | timeout, death, escort loss, quest item destruction, loss of eligibility, abandon, pause, reconnect, restart, fail/retry/recover/re-offer policies |
| Debug/migration | build-time diagnostics, quest asset references, simulated profiles, graph source maps, runtime event trace, schema migration and live-version compatibility |

## Runtime attempt state (not definition)
At minimum: world + owner scope/id, QuestId/definition version, AttemptId, acceptedAt, current lifecycle, active/complete/failed objective IDs and counters, initial snapshot/milestones when required, branch choices, quest-specific flags, participating actors (only if shared policy), next due/reset time, issued start resources, rewards claimed/claim key, last processed committed event cursor, dialogue checkpoint if policy requires. All fields have authoritative ECS/persistence ownership. Do not copy progress into each NPC or browser session.

## State semantics that must be chosen deliberately
Recommended state transitions: **Unavailable** (computed eligibility) -> **Offerable** -> **Offered** -> **Accepted/Active** -> **ObjectivesSatisfied** -> **ReadyToTurnIn** -> **Completed** -> **Rewarded**. Alternative routes include automatic acceptance, automatic completion, instant reward, Suspended, Failed, Abandoned, Expired. A quest can show Completed in journal with RewardPending if it requires a selection, but "complete objective" and "claim reward" must never be the same unchecked boolean.
- **Prerequisite satisfied** is distinct from **quest offered**, **accepted**, **objectives completed**, **turned in**, **reward claimed** and **repeat period available**.
- Start-items and temporary buffs have explicit grant and abandoned/expired cleanup policy; don't delete a player-owned item merely because it was associated with the quest.
- A command can atomically complete Q1 and offer Q2, but not necessarily auto-accept Q2; creator chooses. Replays and duplicate events cannot award twice.
- Change to class/level/party midquest has explicit grandfather/suspend/fail/re-evaluate policy, not default guess.
- Disabling/deleting a quest cannot silently strand active players or erase completed history. Published attempts pin asset versions or run approved migration.
- A quest only available during event window may be accepted before or during window; completion/turn-in after window is an explicit policy, not implied.
- Owner scope vs recipient/reward scope may differ; group credit does not automatically share personal rewards.

## Validation and operational observability
Reject missing targets/assets, invalid objective graph, impossible level range, unknown type/condition, mutually incompatible rewards, inconsistent reset scope, permanent softlock, unhandled phase conflicts and invalid migration. Provide human language reason and graph location. Persist log of quest transitions, actor/event causation, grant IDs and refusal reason without leaking secret state to unrelated players.

## Invariants
Exactly one authoritative attempt transition per idempotent event; numeric progress not negative/overflowed; reward claim idempotent; quest states consistent with active objective graph; mutually exclusive branches cannot both become completed; public UI visibility filtered by owner; after restart no changed state solely from rerunning setup callbacks; no world-wide tick scan per active objective.

## Adjacent authoritative subtabs
[Objectives](02-objective-catalog-and-credit.md) · [Chains](03-chains-and-dependencies.md) · [Dialogue](04-dialogue-stages.md) · [Rewards](05-rewards-and-loot.md) · [Eligibility/phase](06-eligibility-phasing-and-parties.md).
