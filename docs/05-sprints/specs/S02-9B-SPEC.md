# S02.9b — Custom theme editor, live preview and cancel

**Status:** scoped implementation and independent audit PASS (2026-10-31); owner visual acceptance pending.
**Owner:** existing ThemeManager owns tokens/validation; PreferencesStore owns durable preferences; existing Input Manager/action routers own input and intent. Editor view state owns only the local unsaved draft.
**Predecessors:** S02.1 and S02.9a audited; UI closeout and scope isolation audited in commits 464ea7d / af2d790. [Tracker](../../SPRINT-TRACKING.md#s02).
**Binding:** [ThemeManager](../../03-contracts/editor-theme-manager.md), [scope preferences](../../03-contracts/ui-ux/03-theme-and-preferences.md), [shared shell](../../03-contracts/ui-ux/10-visual-language-and-shared-shell.md), [minimal copy](../../03-contracts/ui-ux/16-microcopy-and-density-acceptance.md), relevant controls/actions under contracts/ui/v1, docs/HANDOFF-CODEX.md owner rules. ADR-005 platform is decided; no new technology or runtime interface. No affected OPEN ADR blocks this local preferences work.

## Deliverable and minimal UI contract

Settings > Appearance retains scoped preset selection and exposes Customize Theme for the active home/editor/client/host scope, reusing registered routes wherever they exist. A focused dialog/view has a concise title, editable token fields grouped by their existing semantic namespaces, and Preview, Save and Cancel. Use typed schema-driven inputs suitable for color, number, string and enum token values; preserve valid aliases. Do not replace the editor with a raw JSON text box. Expose all existing editable schema tokens without hand-copying values or adding future client/backend tokens.

The view starts from the active scope's current resolved/custom values and keeps a local draft; edits do not mutate committed settings. Preview validates the draft through ThemeManager, updates the actual app tokens for that scope, and does not write preferences. Save validates then commits the draft through the same existing owner and persists via PreferencesStore. Cancel, Escape and other dismissal restore the exact pre-edit theme/preset/overrides and never persist preview. Starting from a preset and saving creates scoped custom theme data while leaving the bundled preset unchanged. Reopening edits the saved custom values. Other scopes remain unchanged. Invalid edits preserve the last valid preview and committed settings and identify the exact token/reason beside the field. No success toast or placeholder copy.

The controls above are the minimal same-day documented addition permitted by handoff rule 3. Builder must update the UI theme contract and relevant catalog/action metadata for actual added controls, with one action owner and correct counts/index. Reuse existing dialog, menu, text input, action/input and theme style primitives. No ordinary labelled-button tooltips. Baseline accessible names, keyboard/focus and text-entry shortcut suppression apply; deeper accessibility remains S18.2.

## Acceptance

- AC1: actual Settings route opens the editor for the active scope; preset selection remains available and scope-isolated. No direct Splash preset row.
- AC2: real typed token edit -> valid preview changes subscribed app tokens; no preference write/committed mutation before Save. Invalid tokens show exact diagnostics without partial changes.
- AC3: Save persists valid custom theme through the existing preference owner and restores it on fresh startup; other scopes and bundled presets remain unchanged.
- AC4: Cancel/Escape/dismiss restores exact original selection, custom values and overrides, including after one or more previews; reopening has no discarded draft. Scope change or unmount cannot leak a preview.
- AC5: central input/action ownership and theme tokens only; no alternate manager/persistence path, fake network state, hardcoded styling values, placeholders or success announcement. Update docs/catalog metadata and source index consistently.
- AC6: one independent scoped Auditor fully passes the implementation and meaningful filtered verification. Runtime launch and owner visual acceptance are separate evidence.

## Builder scope and verification

One Builder, no parallel executable edits. First map existing theme preview/commit APIs, preference subscription and router ownership with narrow source searches; report a concrete owner/API conflict before implementing any alternate path. Allowed writes: app/src/theme, app/src/prefs, app/src/nav, app/src/home and app/src/ui only where needed for this deliverable, with actual app composition wiring if necessary; relevant contracts/ui/v1 data and UI theme docs. No Rust/backend/engine changes or package installs. Lead owns tracker/history/spec/index/handoff. Preserve unrelated .claude/agents/builder.md change, deleted LICENSE and untracked .claude/settings.json. LF writes. No commit/push or standalone executable build.

From app: `npx tsc --noEmit`; `npx vitest run src/theme src/prefs src/home/appearance.test.tsx src/home/controlCoverage.test.tsx src/nav/ShellRouter.test.ts src/nav/workspaceShell.test.tsx src/workspaces/workspaceSurfaces.test.tsx src/ui/actions/contractDrift.test.ts src/ui/tokenDiscipline.test.ts src/colorLiterals.test.ts --maxWorkers=2`.
From root: `npm --prefix app run build` (frontend only).
New editor tests must be placed under the named theme folder so they are included. One run at meaningful checkpoint; targeted repeat only for a concrete repair. No full suite authorized. Tests must exercise real manager and preference paths with controlled external storage only, independently known token values, preview/cancel non-persistence, invalid-input atomicity and scope isolation. Do not weaken existing assertions to fit behavior.

Lead verification amendments: one tests-first red run of `npx vitest run src/theme/ThemeEditor.test.tsx --maxWorkers=2` is authorized. The new saved-custom startup path exposed a bundled-preset-only startup gate; repair is within AC3. Its targeted verification command is `npx vitest run src/theme/ThemeEditor.test.tsx src/home/startupChecks.test.ts src/home/startup.test.tsx src/ui/tokenDiscipline.test.ts --maxWorkers=2` (from app), preserving unknown-theme rejection. Retain original failing checkpoint and targeted repair evidence; do not broaden to full suite.

Initial independent audit: 301 tests / 22 files, typecheck and frontend build PASS; AC2 failed for unknown-alias error association. Repair/re-audit is limited to structured origin-token diagnostic association and its editor regression, including Preview/Save atomicity and adjacent invalid state. Lead authorized `npx tsc --noEmit` and `npx vitest run src/theme/ThemeEditor.test.tsx --maxWorkers=2`; additional resolver tests require a named command if that owner changes. No broad rerun/build needed for this delta.

Final repair command explicitly authorized after resolver ownership mapping: `npx vitest run src/theme/ThemeEditor.test.tsx src/theme/ThemeManager.test.ts --maxWorkers=2`, plus typecheck. The optional structured `sourceToken` field retains diagnostic origin while preserving the existing missing-target `token` semantics. Delta audit covers this public error provenance addition and adjacent-field Preview/Save regression.

Builder report: docs/06-quality/reports/s02-9b-builder.md, short AC/file/test evidence and exact commands/counts, limitations, click steps. Auditor: docs/06-quality/reports/s02-9b-audit.md, under 25 lines, scoped real correctness only. Lead commits/pushes after PASS, restarts dev app cleanly and supplies owner click steps. Theme import/export is S02.9c and shortcuts S02.9d; do not implement them in this slice.

## Final evidence

[Builder](../../06-quality/reports/s02-9b-builder.md), [initial audit](../../06-quality/reports/s02-9b-audit.md), [repair re-audit PASS](../../06-quality/reports/s02-9b-reaudit.md). Independent initial scope: 301 tests / 22 files, typecheck and frontend build PASS; independent diagnostic repair: 64 tests / 2 files and typecheck PASS. No unresolved in-scope finding. Existing Vite chunk-size advisory and debounced-save/quit timing remain documented. Native dev compilation and app launch succeeded; Computer Use approval timed out, so no pixel, native picker, touch or owner visual acceptance is claimed. Catalog now 546 controls / 299 actions. Next phase S02.9c.
