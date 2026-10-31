# MudMaker — Sprint specifications

[Execution order, phase status and evidence](../../SPRINT-TRACKING.md). S00 is documentation-only. Each implementation sprint uses one scoped Builder/Auditor handoff per phase.

Handoff repair: [S02 UI alignment closeout](S02-UI-ALIGNMENT-SPEC.md), scoped independent audit PASS.

Latest phase: [S02.9b custom theme editor, preview and cancel](S02-9B-SPEC.md), scoped independent audit PASS. Next S02.9c.

Before S02.9c: [owner UI corrections](S02-OWNER-UI-CORRECTIONS-SPEC.md), scoped independent audit PASS; current owner instructions override older independent Appearance selections and selection-only Inspector visibility.

Current owner refinement: [compact retro controls, feedback and Theme submenu](S02-COMPACT-RETRO-CONTROLS-SPEC.md), independent audit PASS and owner desktop appearance/feel accepted before S02.9c; separate touch/native-picker validation not claimed.

Owner priority: S03 native ECS, beginning with [S03.1 identity allocator](S03-1-SPEC.md). [Theme import/export polish](S18-17-THEME-IO-SPEC.md) moved from S02.9c to S18.17; partial work parked, not verified. Preserve accepted desktop UI.

S03.1 passed and pushed af9f0ef; current slice [S03.2 typed schema registry](S03-2-SPEC.md).

S03.2 passed and pushed 7046706; current slice [S03.3 native world/mutation](S03-3-SPEC.md). Notify owner for real in-app testing at S03.4.

S03.3 independently passed; next S03.4 live integration preflight. S02.10a/b/c must pass before S03 closes.

[S03.4 explicit prerequisite phases](S03-4-SPEC.md): contract/codecs, native process, shell bridge and real inspector. Existing-design review and per-phase specs are required before code.

| Sprint | Specification |
|---|---|
| S00 | [Documentation](S00.md) |
| S01 | [Architecture decisions](S01.md) |
| S02 | [Application shell](S02.md) |
| S03 | [ECS](S03.md) |
| S04 | [Persistence](S04.md) |
| S05 | [Spatial world](S05.md) |
| S06 | [Commands](S06.md) |
| S07 | [Loopback auth](S07.md) |
| S08 | [Player client](S08.md) |
| S09 | [Creator tools](S09.md) |
| S10 | [World events](S10.md) |
| S11 | [Quest runtime](S11.md) |
| S12 | [Transit](S12.md) |
| S13 | [Script/graph runtime](S13.md) |
| S14 | [Account/character Studio](S14.md) |
| S15 | [World authoring](S15.md) |
| S16 | [Quest authoring](S16.md) |
| S17 | [Hosting](S17.md) |
| S18 | [Release verification](S18.md) |
