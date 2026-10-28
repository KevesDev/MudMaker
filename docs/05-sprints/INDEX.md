# MudMaker Sprint Roadmap

[Canonical phase tracker](../SPRINT-TRACKING.md) · [Sprint specifications](specs/INDEX.md)

| Order | Cohesive sprint | Milestone |
|---|---|---|
| 1 | S00 → S01 | Documentation and platform/engine decisions |
| 2 | **S09** | **Real launchable Create/Play/Host application shell**, ThemeManager, navigation and reusable canvas |
| 3 | S02 → S03 → S04 → S05 | ECS, durable data, rooms and command runtime (E1 native harness) |
| 4 | S08 → S09C | Authenticated loopback host and independent Player Client (**E2 at S09C.5**) |
| 5 | S10 | Creator Blueprint/command tools, real map editing and Data Manager |
| 6 | S06 → S06Q → S07 | World events, quests and transit, playable through the real Client |
| 7 | S11 → S10A | Typed C# hooks/graph runtime, account and character creation Studio |
| 8 | S12 → S12Q | Visual world systems and quest authoring |
| 9 | S13 → S14 | Durable remote self-hosting (**E3**), release verification |

**Legacy sprint IDs remain unchanged** because existing source contracts and links use them. Execution follows the actual rows above—not numeric sorting or hidden parallel exceptions. S09 must create a real app window before phases expecting human UI inspection. S10.16–18 require S03/S04 and the S09 shell. S08.7 requires the real native command authority; S09C.5 requires S08.7 and the working S09 shell. E1 is a harness, E2 is local play, E3 is public hosting.

**Contracts:** [Local database](../03-contracts/local-database-and-data-manager.md), [prompt/map](../03-contracts/prompt-and-world-map.md), [accounts/character creation](../03-contracts/account-character-lifecycle.md). All phase status/evidence lives in [the tracker](../SPRINT-TRACKING.md).
