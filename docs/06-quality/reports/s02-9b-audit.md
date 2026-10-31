> Historical evidence: separate workspace theme selection and selection-only Inspector expectations are superseded by the owner correction of 2026-10-31.

# S02.9b scoped audit — FAIL
- Owner/contract: ThemeManager remains validation/commit authority; PreferencesStore persists committed inputs; shared ShellRouter owns customize actions. No duplicate route owner found.
- AC1/AC3/AC4/AC5: scoped routes, real CSS binding, atomic Save, fresh startup, preview/cancel non-persistence, cleanup and catalog/schema coverage verified in source and independent filtered tests.
- AC2 NOT MET — MINOR functional finding at `app/src/theme/ThemeEditor.tsx:72` and `:82`: enter `{color.notreal}` in `color.surface.app`, then Preview or Save. `resolve.ts:48` keys unknown-alias diagnostics to the missing target; the editor only matches field names, so the originating field has no adjacent error or invalid state. Its diagnostic appears after every token group instead, contrary to the explicit beside-field contract.
- Repair: associate unknown-alias diagnostics with the originating editable token through structured ThemeManager validation data; retain the exact missing-target/reason and existing atomic rejection. Add a real editor regression for Preview/Save, adjacent field error and unchanged committed/last-valid-preview state.
- Independently executed from app: `npx tsc --noEmit` — PASS.
- Independently executed from app: `npx vitest run src/theme src/prefs src/home/appearance.test.tsx src/home/controlCoverage.test.tsx src/home/startupChecks.test.ts src/home/startup.test.tsx src/nav/ShellRouter.test.ts src/nav/workspaceShell.test.tsx src/workspaces/workspaceSurfaces.test.tsx src/ui/actions/contractDrift.test.ts src/ui/tokenDiscipline.test.ts src/colorLiterals.test.ts --maxWorkers=2` — 301 passed, 22 files, no failures/skips.
- Independently executed from root: `npm --prefix app run build` — PASS; existing Vite chunk advisory retained.
- No runtime launch, native picker, pixels, touch or owner visual acceptance claimed. No performance target applies to this slice.
- Verdict: FAIL pending the single diagnostic association repair. Re-audit only changed validation/editor paths and focused regression; no full suite. Source remained read-only; no commit or unrelated-file edits.
