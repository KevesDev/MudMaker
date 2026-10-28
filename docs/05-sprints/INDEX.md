# MudMaker Sprint Roadmap — gates and execution order

The [single canonical Sprint Tracker](../SPRINT-TRACKING.md) records all phase status, evidence and dependencies. Each sprint has [one implementation spec](specs/INDEX.md). **Sprint IDs remain stable; numerical ID order is not implementation order.** Do not assign a user-facing gameplay sprint before the real player loop exists.

| Gate | Real verification | Phase |
|---|---|---|
| E1 — Native harness | ECS, storage, room/exits and command unit/integration tests; **not a playable MUD** | S02–S05 |
| E2 — First local playable | Actual Player Client connects to a loopback game host, commands move a character and committed scoped messages appear | **S09C.5**, needs S08.7 and S09.1–4 |
| E3 — Public/creator hosting | Approved owner GUI/headless server, durable state, access controls and remote players, safe restart/backup | S13 |

## Correct dependency waves

| Wave | Work | Proof |
|---|---|---|
| 0 | S00 (docs) → S01 (owner-approved architecture) | Index, decisions and verifiable implementation contracts |
| 1 | S02 → S03 → S04 → S05 | Native authoritative ECS and commands (E1) |
| 2 | S09.1–4 **in parallel with** S08.1–7 | Reusable UI foundation; loopback-only native command ingress |
| 3 | S09C.1–5 | **FIRST PLAYABLE (E2)** |
| 4 | S06/S06Q, then S07 | Actual event, quest, and train gameplay validated through Client |
| 5 | Finish S09/S09C, then S10, S11, S12, S12Q as their individual gates allow | Full creator/client tooling and advanced code/graph execution |
| 6 | Complete S08 protective limits, then S13 | Real creator/public hosting and restart/recovery (E3) |
| 7 | S14 | Real release security, accessibility, performance, recovery |

S09 UI foundation may begin after S03 and overlap S04/S05. S08.4 is a **loopback developer test host only**, not a safe internet-facing host or an installer. Before exposing a public port, the remaining S08 admission, quotas, backpressure and security must be audited and S13 owner hosting/operations must be ready.

## Dispatch rules

One small phase per Builder and one different scoped Auditor; multiple independently verifiable deliverables should ordinarily fit within a Claude usage window. Lead chooses focused test/harness proof for each phase. For gameplay-level acceptance at E2, a real Client and live host must be used; a headless harness is not an acceptable substitute. Only the tracker gets DONE/evidence/status. Owner resolves external research, undecided stack, network and persistence ADRs **before** dispatch; agents never go researching those choices. No invented tests or passing claims.

**Feature contracts:** [Database](../03-contracts/local-database-and-data-manager.md), [prompt/map](../03-contracts/prompt-and-world-map.md), [account/character creation](../03-contracts/account-character-lifecycle.md). Phase prerequisites and status: [Tracker](../SPRINT-TRACKING.md).
