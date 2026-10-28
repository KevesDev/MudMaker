# MudMaker Sprint Roadmap

[Canonical phase tracker](../SPRINT-TRACKING.md) · [Sprint specifications](specs/INDEX.md)

| Order | Cohesive sprint | Milestone |
|---|---|---|
| 1 | S00 → S01 | Documentation, architecture, and first native launch check (S01.7) |
| 2 | **S02** | Launchable Create/Play/Host shell, shared UI, hardware-aware optional model wizard |
| 3 | S03 → S04 → S05 → S06 | ECS, embedded storage, verified in-app optional model downloads, rooms and commands (E1) |
| 4 | S07 → S08 | Local host, first real CPU NPC conversation, independent Player Client (**E2 at S08.6**) |
| 5 | S09 | Creator Blueprints, rooms, Data Manager and accessible NPC personality/trigger nodes |
| 6 | S10 → S11 → S12 | World events, quests and transit, playable through the real Client |
| 7 | S13 → S14 | Typed C# hooks/graph runtime, account and character creation Studio |
| 8 | S15 → S16 | Visual world systems and quest authoring |
| 9 | S17 → S18 | Durable remote self-hosting (**E3**), release verification |

**IDs are now sequential and canonical.** Execution follows the actual rows above—not numeric sorting or hidden parallel exceptions. S02 must create a real app window before phases expecting human UI inspection. S09.16–18 require S04/S05 and the S02 shell. S07.9 requires the real native command authority; S08.6 requires S07.9 and the working S02 shell. E1 is a harness, E2 is local play, E3 is public hosting.

**Contracts:** [Local database](../03-contracts/local-database-and-data-manager.md), [prompt/map](../03-contracts/prompt-and-world-map.md), [accounts/character creation](../03-contracts/account-character-lifecycle.md). All phase status/evidence lives in [the tracker](../SPRINT-TRACKING.md).

**Combat delivery:** S05 spatial adapters → S06 real duel UI → S07 clock modes and live host test → S08 Player action controls → S09 Creator combat presets and graph playtest → S10 hostile NPC assistance → S12 escape/pursuit → S13 C# hook parity → S15 encounter authoring → S18 adversarial audit. [Combat contract](../03-contracts/combat-and-encounters.md). Each functional gate includes real in-app testing, not a postponed GUI.

**Inventory delivery:** S03 generic containment → S04 durable item inventory + in-app explorer → S05 authorized custody → S06 get/put/equip/trade commands → S08 Player inventory → S09 one-click Creator container presets → S13 typed C#/graph parity → S15 merchant/loot placement → S18 adversarial audits. [Inventory contract](../03-contracts/inventory-and-containers.md).

**LOOK delivery:** S05 observer-scoped target/detail resolver → S06 full LOOK command with live shell test → S08 native Player inspection → S09 Creator Appearance & LOOK editing → S13 registered C#/visual hook parity → S18 privacy/scale audit. [Contract](../03-contracts/look-and-perception.md).
