# 08 | Quest Behavioral Verification Matrix and Audit Gates

**Status:** PROPOSED full category acceptance suite and anti-fake test contract. **Owner:** Quest runtime QA, independent Auditor and relevant subsystem owners. **Run-cost policy:** targeted tests during build; full suite only Auditor on Lead-authorized sprint-close command. One discriminating oracle per distinct behavior, not parameter-padding.

## Verification oracle
For each case assert (1) initial *durable* QuestProgress and ECS world, (2) actual authenticated gameplay/event input, (3) final authoritative quest and world state, (4) emitted committed events, (5) per-observer visibility/narration and client-facing options, (6) restart/idempotency where relevant. Expected values are derived from spec fixtures, **not** code under test. A test that compares `actual` to the method that computed `actual`, uses mocked "quest completed" engine or only checks a displayed line is invalid evidence.

## Objective family matrix
| ID | Positive case | Negative/counterexample |
|---|---|---|
| QOBJ-01 Talk | Completed dialogue/choice triggers objective per creator milestone | Merely clicking NPC or hidden NPC ID doesn't advance a later-stage objective |
| QOBJ-02 Visit/find | Enter room/region/trigger or discover unique site | Earlier visit not counted when after-accept required; same room revisited doesn't count unique twice |
| QOBJ-03 Collect via loot | Eligible kill loot credited on actual item acquisition | Enemy death without loot acquisition doesn't credit if owner picked Acquire |
| QOBJ-04 Collect via pickup | World pickup credits when allowed | Vendor purchase/trade/craft excluded when rule disallows those sources |
| QOBJ-05 Collect via purchase | Actual authorized purchase credits | Purchase before acceptance ignored when configured |
| QOBJ-06 Collect via crafting/reward/trade | Qualifying provenance credits, if enabled | Transfer back/forth can't farm once-per-object unique count |
| QOBJ-07 Possess/deliver | Has N items at turn-in; atomic consume when configured | Item lost/traded -> no turn-in; no half-consume |
| QOBJ-08 Kill/defeat | Valid target with authored credit policy increments | Nonparticipant/pet/wrong area/duplicate kill IDs rejected |
| QOBJ-09 Escort | NPC follows real path and survives checkpoints -> credit | NPC death, route break, owner leaves, server restart follow configured fail/resume |
| QOBJ-10 Level/class | Active quest "reach level X" credited at threshold; specific class permitted | Already above level before acceptance vs gain-since-accept semantics distinguished; wrong class cannot accept |
| QOBJ-11 Skill/reputation/currency | Gained-since-start vs held-now produces different outcomes | Losing held resource re-evaluates state; duplicate ledger events don't increase earned counter |
| QOBJ-12 Time/survive | World clock persistent deadline/dwell and success policy | Pause/restart and death/exit produce correct failure and no phantom progress |
| QOBJ-13 Interact/puzzle | Custom lever/door/train action committed and credited | Failed action/hidden object only emits error, not success objective |
| QOBJ-14 Cooperative/world | Qualified party/world contribution credited to correct owner scope | Out-of-range/unqualified actor doesn't give unrelated character reward |
| QOBJ-15 Custom script | Namespaced typed event fulfills custom objective | Script cannot forge arbitrary owner or bypass permissions; invalid schema blocked |
| QOBJ-16 Hidden/optional/ordered | Hidden objective credits correctly without journal leak; optional doesn't block | Ordered objective cannot advance prematurely via early events |

## Chain, lifecycle and dialogue matrix
| ID | Expected | Counterexample |
|---|---|---|
| QCHAIN-01 Linear/offer/accept | Q1 complete vs rewarded triggers chosen next-quest offer/autoaccept | No accidental offer merely upon objective satisfaction |
| QCHAIN-02 Parallel and joins | AND/OR/N-of-M gates and fanout converge as authored | One finished prereq doesn't satisfy ALL gate |
| QCHAIN-03 Exclusive choice | Only selected branch unlocked and reward given | Concurrent requests cannot select both |
| QCHAIN-04 Breadcrumb/optional | Optional discovery route, suppress redundant breadcrumb | No unreachable essential quest when skipped |
| QCHAIN-05 Class/world conditional | Class-specific or phase-specific routes can rejoin with history | Missing fallback diagnosed before publish |
| QCHAIN-06 Repeat/timed | New attempt/reset period, correct cooldown and reward eligibility | Event replay, restart or manual reconnect doesn't reset/duplicate |
| QCHAIN-07 Fail/abandon | Alternative recovery/re-offer or failure branch | Start item and quest NPC not orphaned |
| QCHAIN-08 Quest version | Live pin/migrate behavior preserves active progress | Broken graph/new schema rejects publish or quarantines incompatible data |
| QDIA-01 Before | Generic line pool without Q1 | Generic branch doesn't alter quest |
| QDIA-02 Offer | Ineligible vs eligible options and preview | Client cannot select hidden unavailable offer |
| QDIA-03 Confirmation | Accept/cancel with proper one-time starter effects | Double-click doesn't double grant |
| QDIA-04 In Progress / Reminder | Partial counters and hints correct, optional reminders | Reminder alone doesn't complete quest unless authored |
| QDIA-05 Turn-in | Objective done but item delivery/choice still required | Wrong NPC, missing items, bad version rejected |
| QDIA-06 Completion | Completion text and next quest only after committed transition | Interrupted dialogue can't produce speculative success |
| QDIA-07 Post quest | Hidden/reminder/generic/replacement after Q2 as configured | Completed/unclaimed conflation doesn't produce wrong line |
| QDIA-08 Concurrent | Two player dialogue sessions independent on same Bob | NPC doesn't share one mutable conversation cursor |

## Reward matrix
| ID | Expected | Counterexample |
|---|---|---|
| QRWD-01 Guaranteed + choice | Granted baseline and exactly selected item(s) | No double grant on retry, stale choice rejected |
| QRWD-02 Chance/rarity | Seeded weighted outcome and probability math correct | Bad weights/all-ineligible/no fallback diagnosed |
| QRWD-03 Surprise reveal | Server-only result hidden until chosen reveal stage | Client can't reroll by reopening UI/reconnecting |
| QRWD-04 Class/level | Eligible pool changes according to documented evaluation moment | Changing class midclaim doesn't bypass pinned eligibility |
| QRWD-05 Full inventory | Configured fail/escrow/mailbox outcome works | Item never silently disappears or duplicates |
| QRWD-06 Multi-resource | Item+XP+currency+reputation/flag committed consistently | Partial failure rolls back or durable retry completes once |
| QRWD-07 Repeat/party | First-time vs repeat and party credit settings honored | Replay cannot collect forbidden first-time reward |
| QRWD-08 Custom reward | Registered action succeeds with capability, version and trace | Script cannot forge raw inventory write or other player's reward |

## Visibility, party and instance matrix
PHASE-01 Different characters same room: one sees/targets Joe, another can't list, examine, interact or infer Joe via messages/guessed ID.
PHASE-02 Completing Q1 makes Q2/conditional Joe visible on correct revision without stale projection.
PHASE-03 Configured Q2 post-completion variations each work and persist.
PHASE-04 Party offer, progress, replay, reward and phase sync are **distinct controls**; mixed states don't leak or auto-reward.
PHASE-05 Actual private instance has unique ECS IDs and state; valid members can resume, strangers can't enter by guessed ID.
PHASE-06 Phased world objects/exits/dialogue/triggers follow same condition authority; after restart projection remains correct.
PHASE-07 One authorized custom quest action's narration reaches intended observers, but not hidden/unrelated clients; failed action not broadcast.

## Visual authoring / usability matrix
UXQ-01 Guided creator authors Bob->Joe without code; all eight dialogue stages editable; save/reopen/publish.
UXQ-02 Creator authors an escort from station A to B, NPC death failure, resume rule and reward choice.
UXQ-03 Creator authors collect from kill loot vs vendor purchase vs existing held item and previews exact provenance distinction.
UXQ-04 Creator authors level/class eligibility separate from gain-milestone objective and class-specific reward pool.
UXQ-05 Creator authors branching AND/OR/exclusive chain, time/repeat and conditional NPC appearance using graph.
UXQ-06 Creator authors random mystery reward plus choose-one pool, correct probabilities and preview concealment.
UXQ-07 Creator authors a custom registered event from lever/train interaction, binds quest+observer narration.
UXQ-08 Tablet and desktop hands-on: add node, connect, edit text without shortcut leakage, choose reward, inspect invalid edge, drag/pan, undo.
UXQ-09 Error diagnostics explain missing source, impossible completion, no eligible reward, unreachable quest giver and incompatible instance context.
UXQ-10 Full two-client restart with mixed quest states and per-player differences, no silent incorrect visibility or reward.

## Cross-feature fixtures
[Bob/Joe](../bob-joe-quest-scenario.md) proves conditional NPC presence/dialogue and basic chain. [Moving train](../train-reference-scenario.md) proves location, transport and observer narration. A combined scenario should allow quest credit for riding train to Harbor and talking to a phase-visible NPC there; players with different quest states see different NPCs while sharing a physical train. Do not use these two fixtures to avoid testing other quest families.

## Auditor sign-off standard
No untested real branch in promised functionality, no oracle derived from implementation, no fake green, no duplicate core systems, no unsafe client-side phase shortcut, no unexplained performance regression, no unhandled repeat/reward exploit. Each spec-defined acceptance is MET with concrete evidence; otherwise FAIL. Full project suite only with explicit Lead approval at real sprint-close, scoped repairs thereafter. Record executed tests, measurements and human UX report, not fabricated outcomes.
