# S02 UI alignment audit — FAIL (2026-10-30)

- Reviewed original alignment 8cf770a plus current repairs against closeout AC1–AC6, handoff and UI docs 10, 12–16/catalogs.
- AC1, AC2 layout, AC3, AC5: MET. Shared frame toolbar, conditional Create drawers, single Play drawer/profile Cancel, Host bordered buttons/selector, cleanup and deterministic startup test match scope.
- AC4: NOT MET. MAJOR: app/src/nav/ShellRouter.ts:28–40 applies every Appearance pick to every SCOPE_IDS entry. Changing Play's preset overwrites saved Editor/Host/Home selections; UI doc 10:20 and doc 15:17 require scope-specific Appearance and separate preferences. Resolve the active destination to its existing ThemeManager scope and mutate only that scope.
- app/src/nav/ShellRouter.test.ts:58 currently asserts the conflicting global behavior. Replace it with an independent oracle that selects a workspace preset and proves all other scope selections remain unchanged, including Splash/home behavior and rejection preserving state.
- AC6 verification: independent app/ `npx tsc --noEmit` PASS; root `npm --prefix app run build` PASS (existing Vite >500 kB chunk warning).
- Independent filtered command: app/ `npx vitest run src/editor src/play src/host src/nav src/workspaces src/home src/frame src/canvas src/ui src/App.test.tsx src/colorLiterals.test.ts --maxWorkers=2` PASS: 66 files, 958 tests, zero failed/skipped, 57.09 s. Includes 2/2 controlCoverage and 16/16 startup tests, unchanged timeouts.
- Architecture: shared input/actions, token-based styles and silent unowned actions otherwise pass scoped review. No new ECS mutation boundary or backend claim.
- Re-audit only Appearance scope repair and affected callers/tests: recommend app/ `npx tsc --noEmit` and `npx vitest run src/nav/ShellRouter.test.ts src/home/appearance.test.tsx src/nav/workspaceShell.test.tsx src/workspaces/workspaceSurfaces.test.tsx --maxWorkers=2`.
- Native runtime, pixel/touch feel, owner visual acceptance and performance targets not claimed; no source edits or commit performed.
- Verdict: FAIL until the Appearance scope finding is repaired and independently re-audited; no further in-scope findings identified.
