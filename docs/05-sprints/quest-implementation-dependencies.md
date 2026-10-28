# Quest and Phase Implementation Dependency Plan

**Status:** dependency order clarified; source contracts only, NOT implemented. Follow [execution roadmap](INDEX.md) and [canonical tracker](../SPRINT-TRACKING.md).

## Dependencies
**S04 world/schema/persistence** -> **S05 containment/exits** -> **S06 authoritative commands/events/clock** -> **S07.9 real loopback server** and **S02.2–4 shared UI** -> **S08.6 FIRST PLAYABLE** -> **S11 quest engine and conditions** -> **S02 map editor** -> **S09 blueprint editor** -> **S13 typed graphs/scripts** -> **S16 quest/dialogue/phase visual authoring** -> **S17 hosting** -> **S18 release.** S11 can be developed in parallel with S10 world systems once S06 and S08.6 are VERIFIED, using the same registries and event gateway. S16 may begin once S02–S13 are VERIFIED, not as a substitute for finishing their owners.

## S11 — Quest Runtime, Conditions and Phased Projection
**Owner:** Quest Progression + shared Condition Registry + Observer Projection + Instance Manager interfaces. **Prerequisites:** S04–S06, S07.9 and S08.6 VERIFIED for actual player-facing gameplay; approved ADRs for per-owner quest state, event semantics, group scope and phase vs instance rules.
**Complete deliverable:** durable quest definitions/attempts/lifecycle, typed objectives and event subscriptions, prerequisites/branches, atomic reward/next-quest transitions, central reusable condition evaluation, observer-relative targetability/visibility, phase invalidation, private encounter instance API and persistence, command/auth integration, error codes/trace. Test Q-01..Q-19 in engine harness AND through two real Client sessions after S08.6; no claiming network/visual tests from headless-only proof.
**Quality:** no O(players×quests×entities) tick scans. Index relevant watches, confirm cache invalidation, benchmark representative workloads once targets approved. Must reject hidden entity target by ID.

## S16 — Visual Quest/Dialogue/Phase Authoring
**Owner:** quest and dialogue editor UI, sharing existing Blueprint graph runtime and map inspector. **Prerequisites:** S11, S07–S13 VERIFIED.
**Complete deliverable:** creator makes quest and chain graph, dynamic objective, conditional generic/quest dialogue, phase rules and post-completion behaviors, party/replay settings, timed/repeat resets, private instance options, live preview by player state, softlock checks and debug trace. No typing raw JSON or engine code for canonical Bob/Joe workflow.
**Quality:** Q-20–Q-22 + visual session checklist across actual desktop and tablet. The default creator experience remains simple; expert settings are discoverable, not hidden under required scripts.

## Integration gates
- **S07:** network event projections include quest-driven observer filtration and conditioned interaction authorization; two co-located players with different phases.
- **S02:** map cell/entity inspector supports authored quest bindings and phase-aware look previews via linked panel; avoid a second quest-state store.
- **S13:** graph/script runtimes can invoke typed quest conditions/transitions as authorized capabilities; no separate quest implementation inside graph evaluator.
- **S17:** publishing/hosting validates graph and quest versions/links; restore durable quest/player state, instance membership, rewards/phase with live two-client test.
- **S18:** performance/security review includes many active quests and phased NPCs, party transition, reconnect/replay, secrets and post-completion variants.

## STOP decisions
Quest state owner scope, standard phase precedence, party sharing/sync, private instance persistence/cleanup, event delivery, dialogue session lifetime, progress attribution, quest reset and reward semantics, graph validation and compatibility rules are architecture decisions. Document/approve before implementing affected functionality. An agent cannot guess these as incidental helper behavior.

## Scope standard
Do not ship Q1/Q2 only and call a general quest system complete. That fixture is the **minimum cross-feature discriminator**. Complete quest lifecycle, condition rules, objective types/extension API, branching, group/instance semantics and visual authoring are the actual category contract. Separate runtime vs editor due to genuine dependencies, not to defer an unfinished category for convenience.
