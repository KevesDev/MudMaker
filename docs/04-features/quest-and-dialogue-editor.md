# Quest Designer, Dialogue Graph and Content Phasing Editor

**Status:** REQUIRED no-code power + all quest/chain types requested; PROPOSED interaction design. **Owner:** quest editor UI + shared Blueprint graph editor; runtime authority remains ECS.

## Product goal
A beginner should create “Talk to Bob -> Find Joe” by selecting NPCs and simple plain-language options, without understanding state machines, components, JSON, scripting or network sessions. An advanced author must be able to create branching, conditional, party/world scoped, timed, repeatable and highly customized quests with the same visual graph plus custom script hooks. No genre-specific template restrictions.

## Proposed creation experience
**Quest Library:** create quest or chain, choose display category/tags (Main Story, Side Story, Daily, Weekly, World Event, Hidden, Group, repeatable, custom), folder/region, searchable tags, template reuse, dependency diagnostics. These are convenience categories, not separate engine classes.
**Quest card:** title, description, giver, eligibility, who owns progress, how to start, objectives, completion policy, rewards, fail/abandon/replay, after-completion behavior, visibility effects, reminders, permissions and version.
**Chain canvas:** visual directed graph from Start -> condition -> conversation/task -> grant/counter/event -> branch -> complete/reward -> follow-up. Supports AND/OR tasks, sequence, optional goals, parallel objectives, alternatives, joins, mutually exclusive decisions, timers, loops when explicitly bounded, reusable subgraphs, named checkpoints, comments and grouping. Panning, zooming, minimap, searchable palette, typed ports, undo/redo, accessible keyboard/touch editing.
**Dialogue canvas:** separately inspect each speech line/choice with speaker, conditional visibility, per-actor response, weighted/random alternatives, outcome, replay and localization metadata. Reuse shared typed condition/action registry, not a second engine.
**NPC/Room inspector:** select Bob/Joe or a map cell -> **Quests & Dialogue** panel: available conversations, quest giver/turn-in binds, phase rules, after-completion variations, hidden/visible targetability and error/preview.
**Visibility builder:** beginner wording **"Show Joe when"** -> Quest -> Find Joe -> In Progress. Also **"After quest complete"** -> Hide / Remain / Different dialogue / Replace with another version / Custom. Advanced scope choices: individual, party, account, world, private instance; never conflate these.
**Playtest matrix:** select character simulated quest state(s), party member, region/time, active event version; choose observer; preview exactly which NPCs/objects/exits/messages/interaction options appear. Step graph and inspect why each branch matched, claim/reward count and event trace. Preview is not production evidence; real multiplayer integration tests still mandatory.

## Quest patterns to support as composable templates
1. Talk, visit, delivery, collection, kill/defeat, crafting, item use, exploration, escort/defend, puzzle/trigger, reputation/skill/stat, survive/timed, exploration/conversation.
2. Ordered quest chains, parallel objectives, AND/OR, optional tasks, branching choices, mutually exclusive paths, convergence and alternate conclusions.
3. Hidden/discovery quests, auto-accept, manual offer/turn-in, fail/abandon/retry, per-step timers, repeatable/daily/weekly/reset and world event quest rotations.
4. Solo/party/guild/account/world-scoped quests, sharing/credit/eligibility decisions, group instances and coordinated tasks.
5. Location/world-state transformations, phased NPCs/exits/items, instance encounter copies, conditional dialogue and post-completion reactions.
6. Reward types via registered capabilities, objective counters, currencies/items/flags/abilities/reputation/unlocks, choice of rewards, deferred reward delivery, one-time claim and repeat policy.
7. Creator-defined objective event types and scripts, including unusual quest chains outside default genre (solve mystery, conduct election, build railroad, trade sequence, science research, dynamic faction simulation).
No claim that WoW uses exactly these internally; the list is a capability inventory based on researched examples and broader desired extensibility.

## Example workflow, zero code
1. Choose **New Quest** -> name **Talk to Bob** -> objective **Talk to character** -> select Bob in room A -> choose **Complete after conversation** (or on selected choice).
2. On completion choose **Start another quest** -> create **Find Joe** -> objective **Talk to character** -> select Joe in next room.
3. Choose Joe -> **Show only when** -> **Find Joe: In Progress**. Mark **Before quest** = hidden and cannot interact.
4. Bob -> Dialogue options: when Talk to Bob isn't active = random line from configured pool; when active = quest dialogue + complete + offer Find Joe.
5. Joe -> Dialogue options: when Find Joe active = quest content; after completion = creator chooses hide, alternate line, next quest reminder or scripted reaction.
6. Preview: character A has no quests, B has Talk to Bob, C has Find Joe active, D completed Find Joe, E is party member in different phase; inspect who sees/targets Joe.
7. Save -> validate reachability, quest refs and phase rules -> playtest with two characters -> publish.

## Beginner safeguards and advanced options
Standard actions use named simple prompts, tooltips, examples and grouped tabs; advanced scripts behind optional switch. Dragging branch must not silently leave orphan objective. Search lets creator locate graph usages, orphan nodes and paths that never finish; compiler warns about possible softlocks/unreachable quest givers/invalid time windows/reward loops.
Quest content can be inspected and edited from both quest library and cell NPC inspector but all edits write one versioned definition; no duplicate independent copies.
Touch: visible Add Node, Connect, Open Palette, Edit Condition controls, not hover/right-click-only. Keyboard/screen-reader equivalents. Asset save/undo/publish properly versioned.
No competitor branding or UI pixel copying.

## Required hands-on checklist
- Build Bob/Joe without code on desktop and tablet, with keyboard and touch alternatives.
- Preview states before/active/complete and a second co-located observer.
- Author random generic dialogue pool and conditional quest branch; save/reopen retains graph.
- Build alternate post-completion Joe behavior and an actual private-encounter instance as distinct content options.
- Configure a timed repeatable quest and an AND/OR branched quest; inspect progress/reset and correct reward eligibility.
- Show error for broken quest link, unreachable node, invalid version and visibility conflict.
- Launch real game and verify across two independently progressing player sessions.
