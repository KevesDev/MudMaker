# S02 UI alignment closeout

**Status:** scoped implementation and independent audit PASS (2026-10-30); owner visual acceptance remains pending.
**Owner:** existing workspace routers, shared frame, Input Manager and ThemeManager; no new runtime mutation path.
**Authority:** docs/HANDOFF-CODEX.md sections 0, 4a, 6 and 7 override older wording; UI docs 10, 12, 13, 14, 15 and 16 in docs/03-contracts/ui-ux/ and contracts/ui/v1 catalogs.
**Predecessor:** committed UI alignment at 8cf770a, explicitly unaudited. Existing S02 shell gates remain unchanged. No new interface or technology decision.
**Roles:** one Builder repairs this closeout; a different scoped Auditor verifies it. Lead owns sign-off and git operations.

## Scope and acceptance

- AC1: one workspace frame toolbar; Create Save All, Build and View menus, one canvas strip, Problems closed initially, Inspector only with selection; no invented asset folders or filler.
- AC2: Play connected toolbar and one menu-chosen drawer; timestamps under Settings > Appearance; one profile Cancel; delete confirmation only world name. Existing backend-dependent features stay gated by named later sprints.
- AC3: Host's primary section chooser is bordered splash-style buttons, one selected, per owner decision in doc 14. Keep World/Release row and no permanent empty release text. Operations menu may remain for secondary Network/security/recovery routes as documented; do not duplicate primary section routing there. Truthful Stopped status is documented.
- AC4: Settings menus and minimal copy agree with catalogs. Document five added catalog controls, counts 374 elements / 294 actions, profile Name/Save, adapters, encryption/port cues, empty-world cue, drawer titles and Host status. Help in Settings is intentional; Mapper and Automation access retain their later-sprint gates. No missing-backend toast/status/announcement. Theme tokens and centralized input remain authoritative.
- AC5: remove unused InspectorTextInput.tsx after confirming no consumer. Investigate the existing home loading-announcement test with at most two repetitions; repair a demonstrated race without weakening the assertion.
- AC6: typecheck, named filtered tests and frontend build pass; independent audit has zero unresolved in-scope findings. Native packaging, backend work, deep accessibility and visual feel acceptance are outside this closeout.

## Write and review scope

Builder: relevant app workspace/frame/home/UI files and their scoped tests, affected contracts/ui/v1 data if necessary, UI docs 12–16 and contracts/ui/v1/INDEX.md. Preserve unrelated .claude/agents/builder.md, deleted LICENSE and untracked .claude/settings.json. No commits. LF writes only.
Lead: this spec, docs/INDEX.md, tracker, history and handoff status after evidence.
Auditor: read relevant implementation, tests, catalogs, this spec and binding docs only. No source changes.

## Exact verification

From app/: `npx tsc --noEmit`; `npx vitest run src/editor src/play src/host src/nav src/workspaces src/home src/frame src/canvas src/ui src/App.test.tsx src/colorLiterals.test.ts`.
From repo root: `npm --prefix app run build` (frontend only).
Builder runs these once after repairs; loading test may be repeated twice to investigate the reported timing failure. Auditor independently confirms these scoped checks once. No unfiltered suite authorized.

Lead verification adjustment: Builder's default-worker filtered run had 956 passes and two five-second timeouts in home/controlCoverage; that file passed 2/2 alone without timeout changes. Auditor is authorized to append `--maxWorkers=2` to the same named filtered command once, preserving assertions and timeouts while limiting concurrent jsdom contention. This evidence does not by itself establish the cause of the timeouts.

Audit round 1 independently passed all 958 scoped tests, typecheck and build, but failed AC4: Appearance changes in ShellRouter overwrite every scope. Repair scope includes ShellRouter and affected tests, requiring active-destination scope isolation (including home) and rejection preserving prior selections. Builder and delta re-audit commands from app/: `npx tsc --noEmit`; `npx vitest run src/nav/ShellRouter.test.ts src/home/appearance.test.tsx src/nav/workspaceShell.test.tsx src/workspaces/workspaceSurfaces.test.tsx --maxWorkers=2`. No repeated broad suite or build requested for this narrow repair.

## Evidence and owner review

Final evidence: [Builder](../../06-quality/reports/s02-ui-alignment-builder.md), [initial audit](../../06-quality/reports/s02-ui-alignment-audit.md), [repair re-audit PASS](../../06-quality/reports/s02-ui-alignment-reaudit.md). Independent original scope: 958 tests / 66 files, typecheck and frontend build PASS. Independent Appearance repair: 53 tests / 4 files and typecheck PASS. Initial default-worker coverage timeouts remain recorded; unchanged tests passed independently with two workers. Existing Vite bundle-size warning remains; no packaging/performance claim. No unresolved in-scope audit findings.

Builder and Auditor save concise reports under docs/06-quality/reports/s02-ui-alignment-*.md; audit under 25 lines with path:line findings and verdict. Lead records actual commands/results, limitations and acceptance separately from runtime/visual proof. After audit, restart `npm run dev` cleanly and give exact click steps for Create, Play profile/settings and Host section buttons. Owner visual acceptance remains pending until received.
