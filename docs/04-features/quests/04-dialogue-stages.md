# 04 | Dialogue Lifecycle, Conditional Lines and Player Choices

**Status:** User-confirmed eight dialogue stages REQUIRED; binding dialogue precedence, typed sessions and Creator model. **Owner:** single Dialogue Runtime + Quest Conditions; not NPC-specific duplicated logic. **Depends:** [quest lifecycle](01-quest-definition-and-lifecycle.md), [chain transitions](03-chains-and-dependencies.md), [observer narration](../../03-contracts/narration-and-observers.md).

## Distinguish dialogue phase from quest lifecycle state
One NPC can offer more than one quest, and the same player may have one active, one eligible and another completed. Dialogue phase is a **rule selected for this actor + this NPC/object + current quest/chain/world conditions**; not a global `NPC.currentDialogue` property. Dialogue assets are versioned and may be reused by multiple interaction targets.

## Required stages — independently authorable, not one generic string
| Stage / human author label | When selected | Content and actions | Common edge cases |
|---|---|---|---|
| 0. Pre-quest ("Before the quest") | No eligible active quest, or specific locked prereq | World-building dialogue, generic/weighted pool, hints, refusal, discover quest trigger if configured | Hidden quest should not leak; personalized by faction/class/reputation/time; optional "come back later" |
| 1. Quest offer ("Here's the job") | Quest eligible and offered but not accepted | Title, context, objectives, risks, suggested level/group, optional preview rewards, accept/decline/options | Quest giver gone, already offered by another NPC, inventory full, class restricted, quest log full if configured |
| 2. Quest confirmation ("Are you sure?") | Player chooses accept / branch / irreversible commitment | Choice summary, costs or exclusivity warning, final accept/cancel, start item and accepted event | Decline keeps state intact; two simultaneous confirmations do not double accept; version stale re-check |
| 3. Quest in progress ("Working on it") | Active, objectives incomplete | Current contextual lines, player choices, contextual hints, current objectives, partial progress, event triggers | Multiple objectives, sequential stages, changing world state, available alternate quests |
| 4. Quest reminder / status ("Here's what remains") | Active, repeated interaction, optional time-based reminders | Progress summary, hints, last location, deadline, dynamic text, optional alternate clue, softlock recovery | Reminder shouldn't advance quest unless explicitly authored; no duplicate reward; reminders may be hidden or cooldown-controlled |
| 5. Quest turn-in ("You've done it") | ObjectivesSatisfied / ReadyToTurnIn at chosen valid NPC/object/location | Validate ownership, required consumables, dialogue/choice for hand-in, preview pending rewards | Inventory item removed before hand-in, remote turn-in disallowed, wrong NPC/phase, capacity changes during conversation |
| 6. Quest completion ("Well done") | Completion transaction committed (possibly before reward selection per policy) | Epilogue, celebrate, granted skill/flag/chain transition, observer narration, new offer | Never show success on failed transaction; choose reward once; multi-client/reconnect idempotency |
| 7. Post-quest ("After you've finished") | Completed / Rewarded / Failed / Abandoned / Expired / repeat reset | Generic or tailored follow-up, changed NPC personality, new quest reminder, next chapter hints, absence/hide/replace | Completed but unclaimed vs rewarded; repeatable cooldown; class/branch alternative; no reset of prior history |

**Also first-class:** quest-failed dialogue, abandonment/reoffer, replay, interrupted/resumed conversation, hidden/secret dialogue, branch-specific NPC response, world-state/phase changes, no-eligible-quest default and author-defined custom phases. All use one condition + graph system.

## Custom behavior at all dialogue stages
Every one of the eight stages above supports developer-defined **before / after / conditional / replace / run-both** graph and script bindings through one Hook Registry. A stage can run an interactive multi-choice question, show custom lines, grant a conditional reward, emit an event, start/stop a persistent world event, or defer completion. Replacing the turn-in/completion stage must explicitly declare whether the quest remains active, completes without normal rewards, or completes plus a script result; no implicit quest completion on an absent callback. Failed required hooks cannot emit a success line. The complete handler modes, invocation payload, ordering and quiz authority are defined only in [09 — Quest hooks and custom scripts](09-custom-scripts-and-event-hooks.md).

## Dialogue Asset structure
- Stable dialogue asset ID, schema/version and localization; target NPC/object/quest/chain optional and priority, scopes and context.
- Nodes: Line, Option/Choice, Condition, Random/Weighted Line Pool, Set Context Variable, Quest Offer, Confirm Accept, Submit Objective Action, TurnIn, Claim Reward, Complete Quest, Start/Offer Next, Set Flag, Trigger Typed Event, Jump/Subgraph, Wait/Resume, End, Script/Custom Registered Action.
- Each line: speaker, text, tone/tag, visibility, text substitution allowlist, optional side-effect and observer audience rules, fallback/localization and accessibility. Choices: title, eligibility, source/target/action IDs, confirmation, irreversible warning, if-unavailable reason and next-node.
- Random pool: named entry weights, optional no-repeat memory, deterministic seeded RNG and persistence of pool state if needed; no invented random thresholds.
- Per-session state: initiating character, target and world IDs, dialogue asset version, current node, selected choice history, ephemeral vs persisted local values, expiry, revision. Concurrent users never share cursor unless author selected a collaborative conversation.
- Priority/conflicts: creator sees specific resolution ordering and cannot accidentally make two quest offers render at same time; canonical resolution is explicit authored priority (higher first), then condition specificity (more matching conditions), then stable dialogue asset ID. Conflicting equal-priority rules are flagged in Creator; no arbitrary runtime selection. Author explicitly chooses "show multiple quest options as a menu" vs "highest priority only."

## Dialogue stages are creators' UI tabs
A nonprogrammer clicking Bob sees tabs **Before**, **Offer**, **Confirm**, **In Progress**, **Reminder**, **Turn-In**, **Complete**, **After**; each has a plain-language default and **Advanced Conditions** toggle. A preview selector simulates No Quest, Eligible, Offered, Active at 2/5, Objectives Complete, Reward Pending, Completed, Failed, Expired, Repeat Cooldown, Party Member, and Class-specific status. Clicking each tab displays exactly who will see it and what changes after a choice. No raw code/JSON required for default workflow.

## Actual transactional semantics
1. Player requests dialogue start; server verifies NPC visibility and interaction reachability and resolves conversation asset given actor quest/world state.
2. Client receives only authorized lines/options; server retains or validates session node and version.
3. Client selects a choice by typed node/choice ID. Server revalidates preconditions, then submits canonical ECS command for quest advancement, reward, chain or custom event. If it fails, no success line or observer broadcast.
4. Successful commit emits typed result; dialogue next node and any quest/phase updates are observed consistently. Next interaction chooses current appropriate phase; no stale old offer.
5. Interruption: explicit cancel, re-init at current state or persist selected checkpoint according to authored policy. Never auto-grant on merely closing dialog.

## Required negative proofs
Bob with no Q1 chooses generic pool; Bob active Q1 chooses quest line; Q1 complete transitions to Q2 at selected milestone; pending reward differs from rewarded stage; completed Q2 branches to chosen after-dialogue. Hidden Joe is not remotely talkable by guessed ID. Two players simultaneously talking to Bob have isolated choices and histories. Invalid/stale choice fails atomically; no duplicate quest or reward; scripted action and visual node have equivalent permissions. World restart retains only policy-approved conversation checkpoints and durable quest progress.

## No false simplifications
A generic pre-quest line pool is *not* a replacement for eight stages. Quest turn-in is not inherently the same moment as objective completion or reward claim. "Talk" can count on initiating conversation, reaching a specific line, or selecting an option, but creator MUST choose when. Narration to bystanders is separately configured using [observer rules](../../03-contracts/narration-and-observers.md).

**Dialogue default:** show the highest eligible authored conversation, with ready-to-turn-in before active reminder before new offers before generic dialogue. Multiple eligible new quests appear as a selectable menu only when explicitly enabled. A player/target/dialogue session is revision-pinned, 5 minutes of inactivity expiry by default, and aborts safely on target loss, distance, phase change or permission revocation. No quest state progresses on mere dialogue render.
