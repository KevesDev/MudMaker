# 03 | Quest Chains: Prerequisites, Branching, Sequencing, Exclusivity, Replay

**Status:** REQUIRED breadth; PROPOSED graph policy. **Owner:** Quest Chain Graph Registry and Quest Progression Service; references [definition](01-quest-definition-and-lifecycle.md) and [conditions](../../03-contracts/quest-conditions-and-dialogue.md). **Research:** WoW-like quest chain data and exclusive group semantics in [TrinityCore quest_template_addon](https://trinitycore.info/database/master/world/quest_template_addon) and [Blizzard Party Sync](https://worldofwarcraft.blizzard.com/en-us/news/23451087). We adopt *capabilities*, not specific database fields or exact WoW behavior.

## One explicit versioned chain graph
Graph of quest definition references and typed conditional transitions (not just one `nextQuestId` pointer). Nodes may be quest starts, prerequisites, branch decisions, phase changes, parallel sets, episode checkpoints, completion outcomes, repeat windows, state actions, optional subquests and next-story endpoints.
Every edge: source quest/step/branch, destination quest/step, activation event (accepted/step completed/objectives satisfied/turned in/reward claimed/failed/abandoned/expired/timer/world event), condition, grant/offer policy, owner scope, priority/conflict rule, version, idempotency key and validation metadata.
No implicit "completing quest means it was rewarded"; graph must choose trigger stage.

## Chain patterns creator can build
| Pattern | Behavior and edge case |
|---|---|
| Linear | A -> B -> C after declared transition (completed, rewarded, accepted, or condition) |
| Breadcrumb / multiple entry points | A leads to location/NPC B but B can also be discovered independently; optionally suppress breadcrumb A once B started or finished |
| Fan-out | A unlocks B and C simultaneously; each offered separately or auto-granted per policy |
| AND-join | A and B both must reach defined stages before C; partial progress persists across sessions |
| OR-join | Any of A/B satisfies C, first fulfillment rule and provenance recorded |
| Exclusive branch | Choose B OR C; choosing one locks the other; optional explicit rejoin later |
| Conditional branch | Class, faction, choice, world flags, reputation, items, time and other conditions determine B/C; fallback for no match |
| Optional branch / sidequest | B can be completed or skipped while main chain C remains available; skipped doesn't silently count as completed |
| Parallel branches | Several quest arcs progress independently; shared milestone gate afterward |
| Loop / repeat arc | Daily/weekly/event repeat uses distinct attempt IDs and reset policy; loop cannot award infinitely within one period |
| Delayed transition | After deadline, world state/event or NPC arrival; persistent scheduler owns wait and restart |
| Automatic next quest vs offer | Creator chooses whether to *offer*, *auto-accept*, *auto-progress*, *unlock only* or simply set world flag |
| Nonlinear / rejoin | Rejoin after different choices, with later dialogue/NPC state based on recorded choice; exclusive histories persist |
| Multi-owner chain | Account or party/shared world objective can unlock personal quests subject to eligibility; owner scopes explicit |
| Hidden/discovery chain | Not listed until trigger/object discovery; avoid exposing unrevealed quest title/targets in map or error |
| Meta/achievement chain | Complete N/ALL of selected quests across zones; counts reference attempt outcomes without duplicate events |
| Instance/dungeon arc | Quest step starts instance, actor/party enters, completion recorded from that instance, then returns to public world |
| Escort-dependent branch | Escort succeeds -> progress A, escort dies -> fail/alternate quest; no contradictory double branch |
| Mutually exclusive reward-choice branch | Choice of faction/reward locks future route only if configured; selection is authoritative and persistent |
| Seasonal/world event arc | Only offered during schedule, with explicit behavior for active quests when event ends |
| Class/spec specialization path | Different branches and text by creator-defined class/subclass, can rejoin at shared milestone |
| Chain-of-chains | Reusable chapter/episode asset with externally exposed entry/exit ports and version-pinned subgraphs |

## Prerequisite rules
- State-aware: prior quest NOT_STARTED / ACTIVE / OBJECTIVES_MET / READY_TO_TURN_IN / COMPLETED / REWARDED / FAILED / ABANDONED / expired / last attempt result, or a custom flag.
- Can require all, any, N-of-M, no conflicting quest, threshold, class/faction/skill/level or player choice. Avoid one integer `PrevQuest` masking complex prerequisites.
- Negation and OR with missing/unknown quest state need clear typed truth/fail-closed policy.
- A quest accepted but not completed can be a prerequisite; don't force only completed chaining.
- Mutually exclusive chains must reject second accept/reward under races; branch decisions recorded once.

## Transition timing and safety
When the event occurs, evaluate conditions against one authoritative revision, record graph transition and run actions atomically or through durable ordered outbox. There is no gap where Q1 is completed but Q2 is accidentally lost. A transition repeated due to reconnect/replay must not grant another Q2, source item, phase or reward.
Validate unreachable branch, dead-end with no explicit terminator, impossible eligibility requirements, unbounded loops, missing prerequisite entity, mutual exclusion contradiction, unresolved version reference, cycle between quest triggers, hidden required quest without discovery path, and quest dependency on removed content.
A creator can intentionally end an arc with no next quest; not every dead end is an error if explicitly marked End. Support author-approved cycle only with recurrence guard.

## Editor visual UX
Chain canvas: small named quest cards with colored status/phase nodes, labeled transition lines ("When A is rewarded", "After B or C", "Only for Mage", "Offer D"), zoom/group/chapter/subgraph, search and impact analysis. New creator sees guided choices: **What starts this quest?**, **What should happen when it ends?**, **Must another quest be finished first?**, **Can players choose different paths?**. Advanced typed conditions remain inspectable, with preview by character state and path reachability diagnostics.
Graph layout coordinates are authoring-only metadata. Runtime uses compiled typed graph, not drag positions.

## Testing
A->B on completion vs turn-in timing; A/B AND/OR; one-of-many exclusive conflicts; skipped breadcrumb; delayed restart; class branch; party mismatch; fast consecutive events; failure alternate route; replay reset/reward; rejoin preserves choice history; inaccessible required NPC warns before publishing. See [verification](08-quest-verification-matrix.md).
