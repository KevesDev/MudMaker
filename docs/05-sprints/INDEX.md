# MudMaker Sprint Roadmap

[Canonical phase tracker](../SPRINT-TRACKING.md) · [Sprint specifications](specs/INDEX.md)

| Order | Cohesive sprint | Milestone |
|---|---|---|
| 1 | S00 → S01 | Documentation and platform/engine decisions |
| 2 | **S02** | **Real launchable Create/Play/Host application shell**, ThemeManager, navigation and reusable canvas |
| 3 | S03 → S04 → S05 → S06 | ECS, durable data, rooms and command runtime (E1 native harness) |
| 4 | S07 → S08 | Authenticated loopback host and independent Player Client (**E2 at S08.6**) |
| 5 | S09 | Creator Blueprint/command tools, real map editing and Data Manager |
| 6 | S10 → S11 → S12 | World events, quests and transit, playable through the real Client |
| 7 | S13 → S14 | Typed C# hooks/graph runtime, account and character creation Studio |
| 8 | S15 → S16 | Visual world systems and quest authoring |
| 9 | S17 → S18 | Durable remote self-hosting (**E3**), release verification |

**IDs are now sequential and canonical.** Execution follows the actual rows above—not numeric sorting or hidden parallel exceptions. S02 must create a real app window before phases expecting human UI inspection. S09.16–18 require S04/S05 and the S02 shell. S07.9 requires the real native command authority; S08.6 requires S07.9 and the working S02 shell. E1 is a harness, E2 is local play, E3 is public hosting.

**Contracts:** [Local database](../03-contracts/local-database-and-data-manager.md), [prompt/map](../03-contracts/prompt-and-world-map.md), [accounts/character creation](../03-contracts/account-character-lifecycle.md). All phase status/evidence lives in [the tracker](../SPRINT-TRACKING.md).
