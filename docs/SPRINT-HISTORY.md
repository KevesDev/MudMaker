# MudMaker Sprint History

**Purpose:** short append-only records of completed work and resolved architecture questions. The running status checklist is [SPRINT-TRACKING.md](SPRINT-TRACKING.md); do not duplicate it here.

## 2026-10-28 — Documentation-first restart (S00 proposed review)
- Earlier Swing/socket/SQL implementation had been intentionally deleted; current branch `master` contains only minimal Spring Boot bootstrap and startup smoke test.
- Documentation proposal on [PR #6](https://github.com/KevesDev/MudMaker/pull/6) outlines ECS, moving-train spatial model, custom visual Blueprints, weather/spawners, map editor, hosting, test oracles and architecture decisions.
- Added governance adapted from the user-provided AnimLab CLAUDE.md, Builder and Auditor documents: code-isolated Lead, Builder -> Auditor sign-off, single owner, no partial feature approval, targeted tests, final-suite exclusively by Auditor on explicit authorization, manual UX feedback before visual audit, defect non-deferral and token discipline.
- Specified separate committed gameplay events and audience-filtered creator-configured narration. Station arrival, Joe's Car A/Car B movement and disembarking are distinct observer cases.
- **Status:** documentation is a DRAFT proposal, not verified application code. Owner decisions still required; do not record as a completed implementation sprint.

## Future entries
Append only when a sprint is truly VERIFIED: date, sprint, PR/commit, user-visible scope, measured test/benchmark/UX results, auditor verdict, decisions and lessons. Do not paste raw logs or restate the entire spec.

## 2026-10-31 — S02.9b custom theme editor (scoped audit PASS)
- Settings > Appearance > Customize Theme edits schema-derived token fields in the active scope. Existing ThemeManager separates render-only preview from committed input; PreferencesStore persists Save only. Cancel/Escape/destination/unmount discard previews, and saved custom themes pass fresh startup. Actual shell CSS follows active workspace scope.
- Editor/client customize action ownership moved to the shared shell; catalog additions cover 168 token fields and four dialog controls, totaling 546 elements / 299 actions. No new runtime manager or storage path.
- Independent initial audit: 301 tests / 22 files, typecheck and frontend build PASS. Auditor caught missing-alias errors appearing below the form; structured sourceToken provenance now associates the exact diagnostic with its originating field. Independent repair: 64 tests / 2 files and typecheck PASS; zero unresolved findings. [Spec and reports](05-sprints/specs/S02-9B-SPEC.md).
- Native dev app launched; Windows UI approval timed out, so pixels/native picker/touch and owner visual acceptance remain unverified. Existing Vite chunk-size warning and rapid-quit debounce risk remain. S02 now 39/43; next S02.9c.

## 2026-10-30 — S02 UI alignment closeout (scoped audit PASS)
- Host primary sections now use existing bordered choice buttons; the catalog project selector is present, Network remains secondary, and UI docs/catalog index record the kept controls. Removed unused InspectorTextInput. Startup loading test controls its dependency rather than racing immediate rejection.
- Independent audit caught cross-workspace Appearance changes overwriting all scopes. Builder repaired the existing ShellRouter path; independent delta re-audit passed with scope isolation and rejection evidence.
- Independent original scope: 66 files / 958 tests, typecheck and frontend build PASS. Repair: 4 files / 53 tests and typecheck PASS. Builder's original two five-second coverage timeouts are preserved in reports; isolated and independent two-worker runs passed without weaker assertions/timeouts. Existing Vite chunk-size warning remains.
- [Scope and reports](05-sprints/specs/S02-UI-ALIGNMENT-SPEC.md). Owner visual acceptance, native gameplay and performance are not claimed. S02 remains 38/43; next phase S02.9b.
