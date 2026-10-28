# 05 | Rewards, Choice, Rarity, Chance and Claims

**Status:** User-confirmed rewards with choice/chance/class/level constraints REQUIRED; binding reward transaction design, runtime pending. **Owner:** Quest Reward Planner + ECS Reward Grant / Inventory-Currency authority. **Research:** [TrinityCore quest template](https://trinitycore.info/database/master/world/quest_template) distinguishes guaranteed reward items from choice items and has hidden reward flags; [WoW official quest categorization](https://news.blizzard.com/en-us/article/24117139/user-interface-and-quest-updates-in-the-war-withintm) includes reward-linked classes of quest. **Do not copy** numeric table slots, class codes, balancing values or proprietary reward IDs.

## Three fundamental steps
**Offer/preview** describes potential reward; **resolve** freezes eligible choices and any chance results under configured reveal timing; **grant/claim** performs one atomic/idempotent transaction with complete audit. The player does not receive items merely because the UI preview displays them.

## A RewardPlan is an ordered/atomic composition of groups
- **Guaranteed group:** all eligible grants (items, currencies, XP, level effects, skills, flags, reputation, property, access, unlock, recipe, title, mount/pet/companion, custom capability action).
- **Choose-N group:** selectable alternatives, group size/number chosen, eligibility of each entry, required confirmation, whether options are filtered or disabled with reason, preview reveal policy, chosen value preserved across reconnect.
- **Weighted-random group:** select from loot table, quantity/distribution, chance of nothing, rarity weighting, optional independent rolls vs exclusive roll, duplicates policy, fallback. A guaranteed reward and random reward may coexist.
- **Conditional group:** grants filtered or transformed by level/class/subclass/role/species/faction/skills/region/quest choices/reputation/party contribution/world events. Eligibility evaluation moment MUST be chosen: offer, objectives done, turn-in or final claim.
- **Script/custom grant group:** creator-defined registered typed reward actions via same ECS authority, explicit capability and rollback/failure contract. Never arbitrary server mutation in raw script.
- **Reputation/economy group:** creator-defined currencies, XP, faction reputation, seasonal tokens and scaled values; config provenance and modifiers explicit.
- **Deferred/delivery group:** award immediately, offer claim later, store in mailbox/escrow if capacity full, send item after timer, deliver to named location, or explicit failure/retry policy.

## RewardGroup / RewardEntry required fields
RewardPlanId/version, QuestId/version/AttemptId, grant event stage, groupType (guaranteed / selection / weighted / conditional / custom), selected count, eligibility condition, source asset refs/version, preview/display policy, outcome reveal timing, seed/RNG policy, choice deadline/cancellation policy, item quantity range, rarity tier/quality/level scaling, per-entry weight/chance, ownership/binding/trade flags, inventory capacity/overflow policy, group/party contribution policy, first-time vs repeat policy, granted-once key, transactional compensations, audit trace, fallback when no eligible entries.

## Randomness and rarity: avoid ambiguous "chance"
Creator must choose one of:
1. **Bernoulli/independent roll** per entry (e.g. each item has own chance; several items may win).
2. **Weighted pick one (or N without replacement)** from mutually exclusive entries; probability = weight/eligible weight sum; weights are relative, not literal percentages.
3. **Tier-first then item**: select rarity tier by weight, then eligible item in that tier; chance of none explicit.
4. **Guaranteed plus bonus rolls**: guaranteed baseline + separate bonus table.
5. **Deterministic selection**: e.g., class-specific preset with no randomness.
6. **Custom registered rule**: script/graph determines typed selection using authorized RNG and constraints.

Rarity label ("Common", "Rare", "Legendary", creator-defined) is metadata **unless** explicitly mapped to a probability table. A rare-labeled item does not magically have 1% chance. All probabilities/weights author-specified; renderer shows exact computed odds where reveal policy permits. Percentages must validate ranges, and a zero or all-ineligible total requires a specific empty/fallback rule. All pools must be finite/bounded and sampled reproducibly from server-controlled seed; no client-supplied roll result.

## Visibility and surprise
- **Visible full pool**: show entries and odds/rarities before accept or turn-in.
- **Visible categories only**: "Mystery equipment", rarity tier known but exact outcome concealed.
- **Hidden surprise**: outcome and/or pool concealed until claim, but creator can preview from editor; never expose secret server seed/pool through network before reveal.
- **Choose after random** vs **random from chosen category** are distinct configurable flows.
- **Reveal now, claim later**: freeze result on objective completion/turn-in, persist chosen outcome in attempt; no reroll exploit on reconnect/reopen.
- **No eligible rewards**: documented fail, choose generic fallback, or empty grant with explanation as intended by designer; must not silently default to the first item.

## Item/class/level-specific reward selection
Example: reward pool offers swords to Warriors and staves to Mages, or level 20+ item upgrades; if all are ineligible, builder must supply fallback policy. Eligibility can be based on chosen class at accept versus actual class at claim, so changing class midquest cannot reroll better options unless creator configured. Optional requirement: when items are bound/trade-restricted, re-check inventory capacity and item ownership on final grant. Reward display may show an ineligible option disabled with a reason (if author chooses) rather than hiding it.

## Reward delivery and exactly-once behavior
- Quest reward claim is unique per attempt + group/entry/period; double click, retries, two devices, delayed script/outbox retries, server crash and sync/replay cannot grant twice.
- Inventory/currency/reputation/XP increments and quest claim state commit atomically or via durable transactional outbox + idempotent compensating method; no partial reward on a failed transaction.
- Capacity constraints: reject with actionable message, use escrow/mailbox, queue delivery, substitute currency or drop to ground **only** if explicitly configured. Never silently destroy reward or duplicate item.
- Chosen reward persisted before/with claim and cannot change afterward; an already-open reward dialog must revalidate server version, quest state and eligibility.
- Roll outputs are audit-logged with seed derivation/eligible pool hash/resolution event (safely protected), not available to untrusted clients. Server restart doesn't reroll claimed or pre-frozen rewards.
- Credit/reward sharing: group players receive independent reward attempts (or world/party-level pool if author selected), with contribution validation and unique claim rights.
- Repeatable quests explicitly choose first-time vs every-period rewards and scaling/lockout; do not inherit WoW's particular replay restrictions as immutable MudMaker rules.

## Creator editor tabs
**Guaranteed**, **Choose From**, **Random/Surprise**, **Conditions**, **Delivery**, **Repeat & Sharing**, **Preview & Test**. Plain prompts: "Give all of these", "Let player pick one", "Roll for a surprise item", "Only show for this class", "Give only on first completion". Preview shows sample players of different classes/levels, exact resulting eligible pool, displayed/hidden presentation, estimated odds when allowed and fallback behavior. Validation flags empty pools, incompatible criteria, impossible selection count, invalid probability, unbound item, infinite script action, overflow/duplicate claim risks.

## Per-stage custom reward scripting
A reward can be conditioned on any authorized actor/component property (including a creator-chosen rule such as display-name starts with A) and on any committed quest, NPC, world or time event. A graph/script can add to, suppress or **replace** a default reward plan, or start/stop a world event instead of—or alongside—XP and item grants, according to explicit author-configured hook mode and lifecycle outcome. The script returns a typed effect proposal; the central Reward Grant service remains the only authority for item/currency/XP mutation and exactly-once claim. See [09 — Hooks](09-custom-scripts-and-event-hooks.md). No raw script can bypass class/level/owner permissions or invent unlimited grants.

## Test matrix
R-01 guaranteed grant; R-02 choice of one among >1 eligible without double grant; R-03 class-specific exclusion and last eligible fallback; R-04 weighted empirical distribution within statistically justified test tolerance (not magic cutoff), deterministic replay exact seeded outcome; R-05 surprise reveal/seed secrecy; R-06 inventory-full with every configured delivery policy; R-07 two sessions/reconnect/restart idempotency; R-08 currency/item/XP composite partial-failure rollback; R-09 repeat claims vs first-time rewards; R-10 party credit but independent awards; R-11 one eligible in choose-many yields design-time error or declared fallback; R-12 script reward action respects ECS, isolation and capability checks. See [quest test matrix](08-quest-verification-matrix.md).

## Canonical defaults and safe behavior

Use host-owned deterministic RNG streams scoped to quest attempt and reward resolution ID with persisted stream state. Default grant is guaranteed, nonrandom and resolved at successful claim; choices freeze on server acknowledgment of the selection. No party reward sharing unless a RewardPlan explicitly authorizes it. If output cannot fit, do not consume required items or mark reward claimed: remain `RewardPending` and show inventory-full with retry. Mailbox/escrow/ground fallback requires an explicit authored delivery rule. All item, attribute, currency, reputation and quest-claim state changes occur in a native atomic transaction or validated durable saga with idempotent effects. Creator preview never leaks secret RNG seeds to players.
