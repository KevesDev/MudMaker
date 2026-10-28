# 06 | Eligibility, Conditional Presence, Phasing, Parties and Instances

**Status:** REQUIRED per-player Bob/Joe world, level/class-specific quests and group behavior; binding eligibility and phasing contract. **Owner:** shared Condition Evaluator + ECS Quest Progress + Observer/Phase Projection + Instance Manager. Authoritative implementation details in [quest runtime](../../02-architecture/quest-progression-and-phasing.md).

## Separate five independent questions
1. **Can this actor discover or see the offer?** (NPC marker / dialog / location trigger)
2. **Can this actor accept/start the quest?** (eligibility)
3. **Can this actor make progress/receive credit?** (objective participation)
4. **Can this actor see, hear, inspect, target, interact with world content?** (phase/projection)
5. **Where does the action occur and whom does it affect?** (shared location vs isolated party instance)

These are not the same boolean and must use one typed condition system. For example, a player can see Bob but be too low-level to accept his quest; be eligible but not yet accepted; have a quest active but not currently allowed to interact with Joe due to dialogue stage; finish a quest but still see Joe with a new line.

## Eligibility predicates
Available fields through registered component schema, not hardcoded WoW-specific types: character level (min/max, exact, scaling, gained-since-accept), class/subclass/specialization/role, species/race, faction/allegiance/reputation, profession/skill rank, equipped item, item ownership/binding, known spell/ability, achievement, quest state + branch history + prior reward, account/guild/party state, region/world flags, time/calendar/season/event, public server configuration, instance phase, creator-defined typed predicate. Support All/Any/Not/N-of-M and explicit UNKNOWN fail-closed behavior.
Check changes after acceptance based on **author-defined policy**: maintain active, suspend, fail, re-offer or recalc; never delete active progress silently. Class change while quest active, level sync down and quest after reset must have explicit semantics.

## Conditions applied to content
A rule can control: room description or accessible region, NPC/object appearance and detection, actor interaction permissions, dialogue options, item drops/spawns, map icons and quest markers, exit availability/description/lock, environmental effects, event/narration audience, crafting recipe/action, portal to encounter and claim rewards.
- **Before quest:** Joe can be absent from player's list, map, look/examine, target and command API.
- **During Find Joe:** Joe becomes visible and interactable to qualified player; watchers in same room may differ.
- **After quest:** author may hide Joe, show generic/referral dialogue, replace his visual/content variant, keep Joe for all players, or reveal more characters. Post-completion behavior is editable separately from quest completion.
- Server must revalidate direct ID action request, even if a stale client has prior projection. Map hide alone is a data leak.

## Phasing types
**Conditional presentation**: same shared ECS entity, observer-specific visibility/interactability. **Conditional variant**: same logical location but actor projects a different description/NPC version (state sharing explicit). **Personal spawned entity**: entity instance scoped to actor/party, may exist alongside shared world with distinct identity. **Private encounter/world instance**: separate ECS location/world scope with separate state, membership and lifecycle. Do not use actual world copies just to hide one NPC, but expose actual instances for private events/quests.
Phase overrides and conflicts (quest state vs admin override vs world event vs party sync) require a typed priority policy. The phase cache tracks dependencies and invalidates on relevant quest/world/member updates, not on arbitrary render tick.

## Multiplayer and party options
- Quest ownership per character/account/party/guild/world; shared objective counter vs independent per-player counter must be configured.
- **Share offer** (send an invite) != **share progress** (objective credit) != **share rewards** != **share view** != **enter same private encounter**.
- **Party Sync/replay** may temporarily align available content for co-op without erasing underlying progress. Consent, compatibility, replay eligibility and reward lockouts are explicit. Blizzard's [Party Sync](https://worldofwarcraft.blizzard.com/en-us/news/23451087) illustrates why these need deliberate rules rather than a generic party toggle.
- Credit considerations: same room/region, distance, participation damage/healing/protection, group member online/offline, mixed-level/group scaling, join/leave mid-objective, death/reconnect, loot rights, owner disconnect and leader change.
- Same-room different-phase narration: hidden NPC events are not exposed to observer who cannot perceive relevant subject; event projection must filter aliases, source display, map metadata, text interpolation, named errors and subscribers.
- Persistent group world flags/instances require clear ownership and expiry. Player can rejoin their quest instance after reconnect if allowed; access by guessed instance ID denied.

## Creator editor
Eligibility tab ("Who can get this quest?") with chips for class, level, reputation, quest prerequisites and custom flags; Visibility tab ("When do players see Joe?"); Sharing tab ("Can party members help?"); Instances tab ("Create a separate copy for solo/group?"), with simple options and advanced reveal. Preview selects different characters/party members/state to show actual room list, NPC, dialogue and command availability. Error preview explains reason without leaking unrevealed story to ordinary players.

## Test obligations
Two clients co-located with different quest/class states; Joe is visible and interactive only for authorized actor. Party member with mismatched state follows configured sync/independent policy. Private room instance has isolated IDs/state, proper cleanup and save/rejoin. Class change after acceptance follows defined policy. Hidden NPC cannot be discovered by event/list/search/direct ID. Sharing quest offer doesn't accidentally share reward. World restart restores exact phase from durable quest state.

## Decision gates
Shared-instance ownership, visibility precedence, condition truth of missing data, party sync/replay/scaling, reward/credit group participation, phase caching and revalidation, default hiding rules, instance shutdown/recovery, level/class schema and cross-world references must have approved ADRs before implementation.
