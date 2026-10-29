# S02.2-SPEC — Shared UI primitives, action registry and Input Manager

**Status:** APPROVED, IN PROGRESS
**Owner:** Shared UI library (`app/src/ui/`): ActionRegistry, InputManager, primitives. One implementation used by Create, Play and Host; no second copy.
**Approved TDDs:** [02-interaction-state-and-accessibility.md](../../03-contracts/ui-ux/02-interaction-state-and-accessibility.md) (all); [UI catalog INDEX](../../../contracts/ui/v1/INDEX.md), [actions.v1.json](../../../contracts/ui/v1/actions.v1.json), [ui-control.schema.json](../../../contracts/ui/v1/ui-control.schema.json); ThemeManager from S02.1 (`app/src/theme`). CLAUDE.md architecture test 7 (centralized Input Manager).
**ADRs:** ADR-005 decided. No OPEN blockers.
**Predecessors:** S02.1 DONE.
**Phase tracker:** [S02.2](../../SPRINT-TRACKING.md#s02)
**Assigned Builder:** one, sonnet high. **Auditor:** one independent, sonnet high.
**Implementer write scope:** `app/src/ui/**` (new), `app/src/styles.css` only to move shared styles, `app/src/theme/**` only to add tokens the primitives need (with the contract namespace list and `theme-presets.md` updated and every new color token derived and documented per its rules), `app/vite.config.ts` and `app/tsconfig.json` only if needed to import the contracts JSON. No edits to `App.tsx` beyond what S02.3 will replace (leave it working).
**Out of scope (each belongs to a later named phase, not deferred feature work):** DockPanel, TabStrip, InspectorField, SplitView and editor shell (S02.5); MapViewport and GraphViewport (S02.6); pointer-gesture, pen and touch gesture recognizers (S02.7, built on the InputManager surface API defined here); DataGrid, VirtualTree and SearchResults (S09); VirtualTranscript and LogViewer (S08); workspace navigation and transition guards (S02.4); real screens (S02.3).

## Objective
A real, accessible, themed component foundation and one input path, so every later screen is assembled from these parts and every visible control is bound to a registered action.

## Ownership and contracts
**ActionRegistry** loads the four scoped control catalogs and `actions.v1.json` at build time (never retyped), validates them (unique ids, every control `actionId` exists or is the explicit passive marker, test ids unique, schema fields present) and exposes typed lookup. Invalid catalogs fail loudly with the exact id. Actions are dispatched through an `ActionBus` with the contract state machine per control (`ready`, `pending`, `success`, `validation-error`, `denied`, `unavailable`, `recoverable-error`, `disabled`). A second activation while `pending` is ignored and announced, not duplicated. Owners (routers) register handlers by ActionId; dispatching an action with no registered owner returns a structured `unavailable` result naming the action. Nothing optimistic: success is set only by the handler's confirmed result.
**InputManager** is the single owner of keyboard, focus, pointer activation and, through a typed `registerSurface` extension point, wheel, drag, touch and pen streams for later phases. It installs one set of root listeners. Activation (click, tap, Enter, Space) of a control is resolved from the control's `data-control-id` to its ActionId and sent to the ActionBus; primitives attach no activation handlers of their own. A `FocusMediator` tracks the active scope stack (app, workspace, dialog, text editing). Text inputs, textareas and contenteditable (and active IME composition) suppress global shortcuts. Shortcut registration validates collisions within a scope and reports both owners.
**Primitives** (this phase): `Button`, `IconButton`, `Toolbar`, `Tooltip`, `Dropdown`, `Menu`, `Dialog`, `Toast`, `Progress`, `StatusIndicator`, `TextField`, `Switch`. Each takes a `ControlDescriptor` (from the registry) or an explicit passive label, exposes semantic role, accessible name, visible focus from `color.interaction.focus`, hit size from `interaction.pointerHitSize` and `interaction.touchHitSize`, reduced-motion behavior from tokens, and the state variants listed for that control. No network, storage or ECS access inside primitives. All color, size, spacing, radius and motion values come from tokens; no literals.
**Tooltip/help contract:** label, short explanation, why disabled when disabled, shortcut when assigned, reachable by keyboard and touch, never hover-only. Icon-only controls require a text accessible name.

## Deliverables
1. `app/src/ui/actions/` (registry, bus, types), `app/src/ui/input/` (InputManager, FocusMediator, shortcut scopes), `app/src/ui/primitives/` (the twelve above), `app/src/ui/index.ts`.
2. A small developer-only component gallery is NOT delivered (no fake screens). Verification is through tests; S02.3 is the first real screen.
3. Registry validation test over the real shipped catalogs: all four files load and validate. If a real catalog defect exists, the Builder reports it as a blocker and does not edit the catalogs.
4. Any new theme token the primitives need is added through the S02.1 process, documented, and keeps both presets passing contrast and derivation tests.

## Acceptance criteria
- AC-01 Registry rejects: duplicate control id, control referencing a missing action, missing test id, malformed catalog; each error names the id. All four real catalogs validate.
- AC-02 Dispatch: handler result drives the state machine exactly; unknown owner yields `unavailable` with the action id; double activation during `pending` runs the handler once.
- AC-03 Input: Enter/Space/click/tap-equivalent activate through InputManager only (grep proves primitives have no `onClick`/`onKeyDown` activation handlers); text field typing and IME composition do not fire global shortcuts; shortcut collision in one scope is reported, same shortcut in different scopes allowed; modal dialog traps focus, Escape closes non-destructive dialogs and returns focus to the opener.
- AC-04 Accessibility via testing-library role queries: every primitive exposes a role and accessible name; disabled controls explain why in the tooltip; icon-only control without name fails a type or runtime check; focus ring uses the token.
- AC-05 Tokens: grep finds no hex colors, px literals, ms literals or font stacks in `app/src/ui`; both presets still pass the S02.1 contrast and derivation tests.
- AC-06 Theme switch while primitives are mounted updates their CSS variables without remount errors.

## Verification cost plan
**Builder verification:** `npx vitest run src/ui src/theme src/App.test.tsx` in `app`, `npm --prefix app run build`. No launch.
**Auditor scope:** changed files against this spec and the two contracts; rerun the same filtered tests once; run the AC-03 and AC-05 greps; verify the registry validates real catalogs without editing them; judge whether jsdom tests overclaim (pixel, touch and screen-reader behavior are not proven by jsdom: reports must say so).
**Full suite:** NOT REQUESTED. **Regression surface:** theme tests, App.test.tsx.
**Test oracle:** contract text and catalog files; expected states come from the contract state list, not from the implementation.

## Stakeholder hands-on protocol
NOT APPLICABLE this phase (no screen). First hands-on is S02.3.

## Risks
`actions.v1.json` marks all UI design as not implemented; defects found in catalogs are reported, not patched by the Builder.

## Focus return rule (Lead decision)
When a dialog closes, focus returns to its opener. If the opener is gone, focus goes to the nearest connected ancestor of the opener, then to the workspace region. If a dialog that was opened from another dialog closes after that other dialog has closed, the same rule applies from its own opener; the closed dialog's opener is not remembered. One settle step per update decides focus, so closing order never changes the result.
