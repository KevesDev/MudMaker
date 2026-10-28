# MudMaker Sprint Roadmap

**Repo-native source of truth:** [Sprint Tracker](../SPRINT-TRACKING.md) — all phases, current status, evidence and progress in one readable table. [One implementation spec per sprint](specs/INDEX.md) — exact approved contracts, narrow Builder scope, real user test and independent Auditor checks.

## Execution policy
- Each phase is independently testable and intentionally small enough that **multiple Builder → scoped Auditor → user-demo handoffs** can normally complete during a Claude session.
- Builder and Auditor **do not perform research** or choose libraries/architecture. Unanswered research is owner/documentation work and blocks dispatch.
- The tracker is the **only place to change TODO/BUILD/AUDIT/BLOCKED/DONE or progress**. No per-phase files; these were removed.
- Native/technical architecture decisions precede implementation. A source example, documentation or green mock is not evidence of a running engine.
- Run targeted tests for each phase, with a larger independent sprint closeout when explicitly authorized.

## Dependency order

| Area | Prerequisite | Sprint |
|---|---|---|
| Baseline and approved native architecture | Owner decisions and measured proofs | S00–S01 |
| ECS, assets, persistence, rooms and exits | S01, then S02–S04 | S02–S04 |
| Typed native commands, parser and hooks | S03–S04 | S05 |
| Regional/world events and quest runtime | S05 and durable state | S06, S06Q |
| Moving train and nested locations | S04, S06 | S07 |
| Hardened remote input, long RP text and sessions | S03, S05 | S08 |
| Shared UI primitives, central ThemeManager and Editor shell | S03 | S09 |
| Standalone Player Client, third-party MUD adapters/mapper | S08 and shared S09 foundation | S09C |
| Blueprint and no-code command editor | S03, S05, S09 | S10 |
| Native C# / typed graph bindings | S05, S08, S10 | S11 |
| World event and quest visual authoring | Runtime/editor dependencies | S12, S12Q |
| Self-hosting, network edge, durability and recovery | S03, S08, S09C, S11 | S13 |
| Complete security, load, accessibility and release audit | All earlier areas | S14 |

Use [technical docs index](../INDEX.md) to locate exact field/protocol/feature contracts. **Input type is explicit**, never inferred from a post or command's length; see [secure client-input v1](../03-contracts/client-input-v1/INDEX.md). Local game hosts own scripts; external clients send gameplay input only.
