# MudMaker Sprint Tracking

**Purpose:** minimal current checklist only. **74 small deliverable phases** with real checkbox progress, ONE Builder and ONE scoped independent Auditor per phase. User-testable outcome required at every available step. See [phase index](05-sprints/phases/INDEX.md). For rationale/results see [SPRINT-HISTORY.md](SPRINT-HISTORY.md); for dependencies see [sprint index](05-sprints/INDEX.md); for full scope see individual sprint specs. Keep this file brief to minimize agent read cost.

| ID | Status | Phases verified | Depends on | Phase deliverables / specs | Blocker |
|---|---|---|---|---|
| S00 | IN REVIEW | 0/3 | — | [S00 phases](05-sprints/phases/S00.md) | Owner approval of technical design |
| S01 | PLANNED | 0/3 | S00 | [S01 phases](05-sprints/phases/S01.md) | Open ADRs and technology review |
| S02 | PLANNED | 0/4 | S01 | [S02 phases](05-sprints/phases/S02.md) | ECS design approval |
| S03 | PLANNED | 0/4 | S02 | [S03 phases](05-sprints/phases/S03.md) | — |
| S04 | PLANNED | 0/3 | S03 | [S04 phases](05-sprints/phases/S04.md) | — |
| S05 | PLANNED | 0/4 | S04 | [S05 phases](05-sprints/phases/S05.md) | — |
| S06 | PLANNED | 0/3 | S05 | [S06 phases](05-sprints/phases/S06.md) | — |
| S06Q | PLANNED | 0/5 | S03–S05 | [S06Q phases](05-sprints/phases/S06Q.md) | Quest scope/phase/rewards ADRs |
| S07 | PLANNED | 0/3 | S04–S06 | [S07 phases](05-sprints/phases/S07.md) | — |
| S08 | PLANNED | 0/4 | S03, S05, S06Q | [S08 phases](05-sprints/phases/S08.md) | — |
| S09 | PLANNED | 0/6 | S04, S08 | [S09 phases](05-sprints/phases/S09.md) — central theme → customization → graph paper → shell → world map → user visual acceptance | — |
| S10 | PLANNED | 0/4 | S03, S09 | [S10 phases](05-sprints/phases/S10.md) | — |
| S11 | PLANNED | 0/9 | S05, S06, S06Q, S10 | [S11 phases](05-sprints/phases/S11.md) — C# compile/proto → hook registry → native dispatcher → worker → persistent overrides → themed graph → publish/restart → multiplayer | — |
| S12 | PLANNED | 0/4 | S06–S07, S09–S11 | [S12 phases](05-sprints/phases/S12.md) | — |
| S12Q | PLANNED | 0/5 | S06Q, S08–S11 | [S12Q phases](05-sprints/phases/S12Q.md) | Full quest editor feature contracts |
| S13 | PLANNED | 0/6 | S03, S08, S11–S12, S12Q | [S13 phases](05-sprints/phases/S13.md) — GUI/CLI → preflight → durable restart → remote join → backups → hosting walkthrough | — |
| S14 | PLANNED | 0/4 | S02–S13, S12Q | [S14 phases](05-sprints/phases/S14.md) | — |

Each checked phase requires: named Builder deliverable, focused executable test evidence, independent scoped Auditor PASS and a creator-testable demo (or executable harness before UI exists), with evidence link in the phase checklist. **No bulk phase sign-off; no full test suite every phase.** The following three engineering gates are explicit S11/S13 phase deliverables: **SDK + Protobuf compile/roundtrip (S11.1–S11.2); native hook dispatch and ECS effects (S11.3–S11.6); startup, scripts, persistent world restart/recovery (S11.8, S13.1–S13.3).** User-facing editor/theme milestones are S09.1–S09.6.

Status: PLANNED / BLOCKED / IN PROGRESS / UX REVIEW / AUDIT / VERIFIED. Do not mark VERIFIED without implementation, executed evidence and Auditor PASS. Do not place history, discussion, lengthy findings or speculative dates in this file. Update only changed rows; never reread the entire history by default.
