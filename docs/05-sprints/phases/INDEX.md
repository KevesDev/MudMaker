# Phase-by-Phase Sprint Checklist — Agent Entry Point

**Policy:** ONE Builder and ONE independently scoped Auditor per finishable phase. Frequent creator-demonstrable milestones take priority over large multi-week feature claims. A checkbox is checked **only after** a real test/demo, independent Auditor PASS, and linked evidence. Sprints remain PLANNED until work begins; no checkbox is currently verified.

**Agent read budget:** [main tracker](../../SPRINT-TRACKING.md) → **one** linked phase file below → exact implementation contract(s) identified for that phase → actual affected source/tests. Do not load all sprint pages.

| Sprint | Phase checklist | Planned phases |
|---|---|---:|
| S00 | [S00](./S00.md) | 3 |
| S01 | [S01](./S01.md) | 3 |
| S02 | [S02](./S02.md) | 4 |
| S03 | [S03](./S03.md) | 4 |
| S04 | [S04](./S04.md) | 3 |
| S05 | [S05](./S05.md) | 4 |
| S06 | [S06](./S06.md) | 3 |
| S06Q | [S06Q](./S06Q.md) | 5 |
| S07 | [S07](./S07.md) | 3 |
| S08 | [S08](./S08.md) | 4 |
| S09 | [S09](./S09.md) | 6 |
| S10 | [S10](./S10.md) | 4 |
| S11 | [S11](./S11.md) | 9 |
| S12 | [S12](./S12.md) | 4 |
| S12Q | [S12Q](./S12Q.md) | 5 |
| S13 | [S13](./S13.md) | 6 |
| S14 | [S14](./S14.md) | 4 |

Total: **74 finishable phases**. For S09 consult [ThemeManager](../../03-contracts/editor-theme-manager.md). For S11 consult [scripting v1](../../03-contracts/scripting-v1/INDEX.md), [source/hosting flow](../../03-contracts/scripting-v1/09-build-publish-restart-run.md). S13 verifies same host-owned published release through GUI and headless launch. S14 is a separate release audit, not a way to skip phase-level audits.

## Required evidence record (per phase)
`Phase ID | Builder scope + commit | executable scoped commands/results | user hands-on steps/result (or runnable harness before UI exists) | Auditor independently tested scope and PASS/FAIL | residual defects (must be NONE for PASS) | evidence links`

If a prerequisite blocks the phase, mark **BLOCKED** in its evidence note and keep unchecked; never invent tests, simulated successes, dates or passing metrics.
