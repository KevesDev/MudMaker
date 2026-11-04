# S03.4d1 — Inspector field composition prerequisite

**Status:** independently PASS, 2026-11-03; [audit](../../06-quality/reports/s03-4d1-audit.md),114/114 scoped tests and typecheck. Parent S03.4 remains incomplete. c2 independently PASS/pushed5f5ed4c. [Bounded preflight](../../06-quality/reports/s03-4d-preflight.md) found an actual multiline/composition prerequisite; d2 binds live objects after this phase is pushed.

## Owner and reviewed design

Shared TextField owns text editing/label semantics; Inspector owns compact groups/field layout; existing InputManager owns physical input and semantic action dispatch. Review UI02 interaction/focus, UI10 shared language, UI12 Inspector, UI15 explicit opening and UI16 density, plus commands-and-input. Preserve accepted theme tokens, square compact controls, existing actions and drafts. No new libraries, state manager, event router, native API or OPEN ADR decision. This phase adds reusable capability only; no new visible standalone controls or runtime-object claim.

## Exact scope

One medium Builder then independent medium Auditor. Read only affected shared primitive/Inspector callers/tests. Allowed source: app/src/ui/primitives/TextField.tsx, app/src/editor/Inspector.tsx and EditorShell.tsx only if descriptor plumbing is necessary; matching Inspector.test.tsx, EditorShell.test.tsx, app/src/ui/primitives/primitives.test.tsx. If actual TextField ownership file differs, report exact path before editing. No other primitive/router/input file edits without named finding and Lead scope.

- Extend existing TextField to support a real textarea for multiline values, sharing existing change/focus/error/IME/InputManager ownership. Existing single-line behavior is unchanged. Enter in multiline inserts a newline and never commits/dispatches an application action; explicit registered Apply in d2 will commit. No new multiline component/duplicate text state owner or raw click/key/change dispatch bypass.
- Add the smallest optional Inspector composition route that allows a group to render already-labelled shared fields exactly once. Preserve legacy descriptor fields and existing callers unchanged. Prefer an optional section content slot over suppressing labels globally or building another field library. Preserve group region/focus/error semantics. EditorShell only forwards the same optional descriptor if required.
- Preserve typed draft on errors, unique accessible labels/descriptions, native disabled/readonly semantics and current compact theme sizing. No new size/color literals or automatic explanatory copy.

## Acceptance and exact verification

Meaningful shared-component tests prove unchanged single-line Enter activation, multiline newline/no activation, shared InputManager changes/IME behavior, one accessible label per composed field, existing legacy Inspector fields/errors/section focus. Reuse existing coverage; add only missing distinct oracles. Do not add duplicate implementation-shaped tests.

Builder then Auditor each run ONCE from F:\MudMaker\app:
`npx vitest run src/ui/primitives/primitives.test.tsx src/editor/Inspector.test.tsx src/editor/EditorShell.test.tsx --maxWorkers=2`
and `npx tsc --noEmit`.
No additional suites/builds/native/Cargo/dependency/hash/tool checks. No app restart or manual launch: current app/native is intentionally retained; this is a prerequisite, not a user click milestone. No executable changes outside approved paths. If a real failure needs broader scope, report exact cause/proposal first.

Reports <20lines docs/06-quality/reports/s03-4d1-builder.md and s03-4d1-audit.md: owner/API impact, exact source files/commands/counts/risks. Full independent PASS precedes explicit owned commit/push/verified GitHub working. d2 gets its own exact spec for runtime controls/registrations/data semantics and real app clicks; no hidden runtime wiring in d1.

Usage before/after each batch/response and at least every minute active; no new large work <=10%, stop/checkpoint/timer around5%. Preserve unrelated .claude/agents/builder.md, deleted LICENSE, untracked settings and _parked. S02.10a/b/c before S03 closes; scale/identity/template/spawn/monitoring/replication gates stay binding.

## Bounded test repair
Initial named filter113/114: primitives97/97 and EditorShell7/7 passed; Inspector9/10. New Inspector test incorrectly assumed jsdom synthesizes native button activation from Enter. Authorize test-only uncancelled-key assertion plus explicit click modelling native activation, preserving collapse/retained-value/error/focus assertions. Rerun only Inspector.test.tsx with maxWorkers=2, then original typecheck. No production input change or claim of actual browser keyboard proof; independent Auditor still original named gates once.
