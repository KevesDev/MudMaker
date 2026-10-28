# MudMaker — Sprint Specifications (agent navigation)

**Execution order:** [Dependency roadmap](../INDEX.md) — S02 provides the real application shell directly after S01. S07/S08 then provide actual connected gameplay before S10/S11/S12. Numeric IDs are legacy references; the canonical tracker orders execution. **Architecture:** ONE overarching [repo-native tracker](../../SPRINT-TRACKING.md) for status, and ONE implementation spec per sprint below. **No per-phase files or duplicate checkboxes.** S00 documentation phases require no Auditor; implementation phases do. Phases should be narrow enough for multiple independently audited concrete deliverables in a normal Claude usage window; never require a Builder/Auditor to research technology. Read **only the active sprint's spec** plus its exact contract files, not this whole folder.

| Sprint | Focused spec |
|---|---|
| S00 | [S00](./S00.md) |
| S01 | [S01](./S01.md) |
| S02 | [S02](./S02.md) — first launchable app, theme and navigation |
| S03 | [S03](./S03.md) |
| S04 | [S04](./S04.md) |
| S05 | [S05](./S05.md) |
| S06 | [S06](./S06.md) |
| S10 | [S10](./S10.md) |
| S11 | [S11](./S11.md) |
| S12 | [S12](./S12.md) |
| S07 | [S07](./S07.md) |
| S08 | [S08](./S08.md) — standalone player Client and third-party MUD toolkit |
| S09 | [S09](./S09.md) |
| S13 | [S13](./S13.md) |
| **S14** | **[Account & Character Studio](./S14.md)** — account policies, visual creation graphs, roles and lifecycle hooks |
| S15 | [S15](./S15.md) |
| S16 | [S16](./S16.md) |
| S17 | [S17](./S17.md) |
| S18 | [S18](./S18.md) |

**Owner research gate:** research and decisions are authored in contract/research pages before dispatch. Unknown ADR, unvalidated limit, missing parser behavior or incomplete test oracle ⇒ `BLOCKED` in tracker; owner handles research, then updates spec. Builder implements; Auditor independently checks. Evidence returns to the single tracker.
