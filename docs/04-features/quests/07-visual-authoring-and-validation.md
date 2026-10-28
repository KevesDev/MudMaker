# 07 | Visual Quest Authoring: Beginner UX, Graph Editor and Validation

**Status:** Owner-confirmed visual accessibility REQUIRED; interaction details PROPOSED. **Owner:** Quest/Dialogue Editor UI + shared typed graph/condition assets. **Related:** [objective palette](02-objective-catalog-and-credit.md), [chain graph](03-chains-and-dependencies.md), [dialogue stages](04-dialogue-stages.md), [reward form](05-rewards-and-loot.md), [visibility](06-eligibility-phasing-and-parties.md).

## Two levels, one exact runtime
**Guided Create Quest** wizard can build common quests without showing technical terms. Advanced graphical editing exposes every typed field, branching and custom registered node without modifying the runtime rules. The wizard and node canvas write the same versioned QuestDefinition; do not create a "simple quest engine" separate from the real ECS quest runtime.

## Screen IA: actual tabs and subtabs
- **Quest Library:** quest folders/categories, searchable tags, chapters/chain refs, asset version, usage/dependency graph, create/clone/migrate, bulk validation.
- **Quest Overview:** Name / description / importance / journal / map marker / icon, quest owner and repeat policy.
- **Who Can Start?** class/level/skills/faction/prior quests/world flag/time, offer source and trigger; helper text "Only offer to Mages of level 20 or higher".
- **What Must They Do?** visual objective cards + searchable palette by plain-language tasks: Talk to, Go to, Collect, Have, Deliver, Defeat, Escort, Use, Reach Level, Craft, Earn Reputation, Wait, Custom. Each opens purpose-built editor: source restrictions for collect, kill credit policy, escort fail/recovery, threshold vs gained-since-start for level.
- **Quest Chain:** connections/branches/prerequisites/exclusive choice/AND/OR/return/repeat using typed graph; distinct color/shape for grant, offer, require, skip, join, end.
- **Conversations:** subtabs **Before / Offer / Confirm / In Progress / Reminder / Turn-In / Complete / After**, plus Fail / Abandon / Replay as relevant. Speaker lines, choices, random line pool, conditional fallback.
- **Rewards:** subtabs **Guaranteed / Player Choice / Chance & Surprise / Conditions / Delivery / Repeat & Sharing**. Show computed eligibility and probabilities when allowed.
- **World Changes:** NPC/object visibility, phase variants, exits/locks, spawners/weather, private instance, dialogue variant, custom event/narration; link to real ECS objects.
- **Sharing & Instances:** quest scope and credit, party sync/replay/reward, instance templates and lifetime.
- **Preview & Test:** simulated player profiles, multi-character comparisons, graph stepper, trace, warnings and manual playtest launch.
Display complex options in collapsible sections with readable help, not hundreds of ungrouped controls.

## Map / NPC / object contextual editing
Click a room cell -> contents -> NPC Bob -> **Quests & Conversation**: select existing or create quest, bind offer/turn-in, edit 8 dialogue stages and generic line pool. Select Joe -> **Visibility**: "Show Joe only when [Find Joe] [In Progress]" and "After quest ends: [Hide / Generic / Reminder / Replace / Custom]". Selecting a world item shows "Counts toward which quests?" and allowed acquisition sources; selecting train/escort shows objective bindings and path conditions. All views open authoritative shared asset by ID, never duplicate it in a per-NPC file.

## Example guided flow (Bob -> Joe)
1. New Quest -> **Talk to Bob**, task **Speak to a character**, choose Bob from searchable map/entity selector; ask when conversation counts (start/end/selected choice).
2. In Bob's Conversation tabs, Before = random generic pool, Offer = Q1 offer, Confirm = accept text, In Progress = quest-specific branch, Reminder = configurable, Turn-In/Complete = dialog when success, After = custom lines.
3. Completion Actions -> "Offer next quest" -> **Find Joe**, choose Joe, task **Talk to Joe** (or reach room B).
4. Joe -> Visibility -> Show while Find Joe active; Before = hidden and untargetable; After = choose hide or new dialogue reminder.
5. Rewards -> Guaranteed XP/item plus optional class-eligible choice and weighted random surprise; choose claim timing/overflow.
6. Test four characters: no Q1, Q1 active, Q2 active, Q2 rewarded, plus a party friend in a different phase. Verify Joe visible/targetable only to allowed observers.
7. Add optional branch if player is a different class and a conditional alternate quest. Preview reachability and reward fallbacks.
8. Save and close; reopen exact graph, world state; play in two-client server.

## Authoring UX for complex cases
- Searchable node palette with plain-language names, hover-independent click-to-add and keyboard/touch alternatives. Dragging edges shouldn't accidentally pan/scroll tablet; explicit connect mode.
- Distinct authoring graph contexts: **quest chain** (between QuestDefinition assets), **quest objective graph** (inside one quest), **dialogue graph** (speech/choices), **behavior graph** (system scripts). Different views, same typed condition/event/action registry; avoid one giant opaque mega-graph.
- Reusable subgraphs/templates for "Collect N from X", "Escort from A to B with failure", "Offer Q2 after Q1", "Choose random reward", "Class-specific version". Creator can override parameters without forking engine.
- Graph ports typed, connection constraints and help in everyday wording. Node rename, group/comment, minimap, search by entity/quest, jumping to referring object, undo/redo with correct versioned asset ownership.
- Preview accepts sample quest state, level/class/inventory/party/world flag/time/instance plus a second observer; output shows **why** visibility, dialogue and reward branches selected, allowed actions and event/reward trace.
- Show validation at edit/save/publish: missing quest giver/turn-in NPC, unconnected terminal, unreachable essential objective, invalid class/level range, impossible reward choice, missing item source, conflicting exclusive branches, unbounded repeat cycle, phase invisible target, missing alternative after conditional, unclaimed mandatory reward, no escort recovery policy, ambiguous multiqueue.
- Validation severity "hard error stops publish" vs "warning requires explicit creator acknowledgment" determined by actual correctness risk, not convenience.
- Author must specify an actor/party visibility/audience for bystander narrations triggered by quests; player-dialogue and room observer broadcast use same event gateway but different content.

## Tablet and accessibility acceptance
Large touch-friendly actions for adding/connecting/expanding nodes, not relying on right-click or hover, responsive bottom drawer/side inspector, pointer capture and focused text entry; keyboard shortcuts don't fire while typing quest/dialogue text. Screen reader can traverse node labels/edges/objectives and read conditions; color-only labels insufficient. Drag-and-drop has button-based equivalent. State preview remains navigable without canvas gestures.

## Visible per-stage script and event actions
Every dialogue, objective, reward, chain and NPC interaction editor exposes a **When this happens...** action list. Creator chooses **Use normal**, **Before**, **After**, **Replace**, **Only when condition**, or **Both**, then attaches a visual graph or versioned custom script. Default beginner actions include **Ask a multiple-choice question**, **Grant a reward to characters matching rule**, **Start world event**, **Stop world event**, **Show dialogue**, and **Advance or defer quest**. Preview shows exact quest state, event state, reward and observer effects in each branch; the map/NPC inspector edits the same HookBinding asset. Complete capability schema: [09 — Custom hooks](09-custom-scripts-and-event-hooks.md).

## Advanced creators
Expose a registered custom objective/condition/reward/script node through typed schemas and explicit capability requirements. It must still plug into same graph verifier, authoring palette, instance/world permission checks, deterministic scheduler and persistence. "Custom script" is an escape hatch for novel mechanics, never the only way to handle mainstream quest variants.

## Acceptance definition
A quest category is incomplete if any of its documented modes cannot be authored, saved, validated, played, resumed, versioned and edited through the production UI. Bob/Joe alone is a test fixture, not full quest coverage. The editor's only implementation of a "quest" must not be a hardcoded two-step demo.
