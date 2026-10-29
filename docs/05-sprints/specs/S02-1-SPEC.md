# S02.1-SPEC — ThemeManager

**Status:** APPROVED, IN PROGRESS
**Owner:** ThemeManager (one library, sole owner of theme schema, resolution and token distribution)
**Approved TDDs:** [editor-theme-manager.md](../../03-contracts/editor-theme-manager.md); [03-theme-and-preferences.md](../../03-contracts/ui-ux/03-theme-and-preferences.md) (ThemeManager operation and scope sections); token values in [theme-defaults.v1.json](../../../contracts/ui/v1/theme-defaults.v1.json)
**ADRs:** ADR-005 decided (React/TypeScript/Vite). No OPEN blockers.
**Predecessors:** S01 complete.
**Phase tracker:** [S02.1](../../SPRINT-TRACKING.md#s02)
**Assigned Builder:** one, sonnet high. **Auditor:** one independent, sonnet high.
**Implementer write scope:** `app/src/theme/**` (new), `app/src/styles.css`, `app/src/App.tsx`, `app/src/main.tsx`, `app/vite.config.ts` and `app/tsconfig.json` only if needed to import the contracts JSON. Nothing else.
**Out of scope:** user theme persistence, import/export UI, preview UI (S02.9); UI primitives (S02.2); graph-paper renderer (S02.6); Client-specific terminal token rendering. Namespaces for later surfaces still validate and resolve here.

## Objective
One ThemeManager that loads the centrally pinned token defaults, validates them against a typed schema, resolves per scope, and distributes immutable snapshots that the UI consumes as CSS custom properties. After this phase no component style contains a hard-coded color, font stack, spacing or animation duration.

## Ownership and contracts
- `app/src/theme/` exports: `ThemeManager` (class), `ThemeSchema` types, `ResolvedTheme` (`scope`, `themeId`, `revision`, `accessibility`, frozen `tokens`), and a React hook `useTheme(scope)`.
- The defaults come from `contracts/ui/v1/theme-defaults.v1.json` imported at build time; the JSON file is never copied or retyped. Scopes `editor`, `client`, `host`, `home` as in the file, with `inherits` resolved.
- Resolution order exactly as in the contract: application defaults, selected user theme, user explicit token overrides, operating-system and accessibility adjustments (text scale, contrast, reduced motion). User theme and override inputs are accepted by the API (`setUserTheme`, `setOverrides`, `setAccessibility`) but nothing persists in this phase.
- Validation is data only, no expressions. Token types enforced from the file's declared types (colors valid, dimensions non-negative, integers positive where required, supported font stacks, alias references non-cyclic). Failure returns a typed error naming the exact token and reason, and the manager keeps the last valid snapshot.
- Snapshots are deeply frozen and observable (`subscribe`, `getSnapshot`; usable with `useSyncExternalStore`). Scopes are isolated: changing `client` never changes `editor`.
- Applying a snapshot writes CSS custom properties on the document root for its scope (one function, one place). Token names map to variables deterministically (`color.surface.app` to `--color-surface-app`).
- Contrast adjustment and text scale are computed, not hand-tuned per component. If the defaults file does not define high-contrast values, the manager derives them by a documented rule and a unit test checks the resulting ratio against WCAG AA.
- No new runtime dependency. Hand-written validator driven by the token type declarations.

## Deliverables
1. The library above with full unit tests.
2. `styles.css`, `App.tsx` and `main.tsx` converted to consume tokens only; the existing launch screen looks equivalent. No hard-coded hex, `px` spacing, font stack or duration remains in `app/src` outside `app/src/theme/`.
3. A generated token-name list test asserting every token namespace named in the ThemeManager contract exists in the resolved `editor` scope, and every `client` namespace in the 03 contract resolves in `client` scope (if the defaults file lacks a namespace, the Builder reports it as a blocker; do not invent values).

## Acceptance criteria
- AC-01 Defaults load and resolve for all four scopes; `home` and `host` inherit editor values; snapshot is frozen (mutation attempt throws or is ignored without changing state).
- AC-02 Layering: a user theme value beats the default; an explicit override beats the user theme; an accessibility adjustment is applied last. Each tested with exact expected token values.
- AC-03 Invalid input: bad color, negative dimension, alias cycle, unknown token, wrong type, unsupported schema version each return an error naming the token; last valid snapshot unchanged.
- AC-04 Scope isolation: changing client overrides leaves editor snapshot object and CSS variables unchanged.
- AC-05 Subscribers are notified once per accepted change and never for rejected input.
- AC-06 Text scale 1.5 multiplies font sizes exactly; reduced motion zeroes motion durations; high-contrast result meets 4.5:1 for primary text on app surface.
- AC-07 Repository grep for hex colors and font stacks under `app/src` outside `app/src/theme/` and tests finds none.

## Verification cost plan
**Builder verification:** `npx vitest run src/theme` and `src/App.test.tsx` in `app`; `npm --prefix app run build`; `cargo check` not needed. No launch required from Builder.
**Auditor scope:** changed files against this spec and the two contracts; rerun the same filtered tests once; run the AC-07 grep; confirm no persistence, no dependency additions, no duplicate token definitions, and the CSS variable mapping is single-sourced.
**Full suite:** NOT REQUESTED. **Regression surface:** App.tsx, styles.css, main.tsx (launch screen).
**Test oracle:** expected values come from the defaults JSON fixture values and WCAG 2.2 contrast formula written in the test independently of the implementation.

## Stakeholder hands-on protocol
Lead launches with `npm run dev`; owner confirms the launch window looks equivalent to before (dark panel, readable text). No new interaction yet; theme switching UI is S02.9.

## Risks
`theme-defaults.v1.json` status says "NOT_RENDER_TESTED": the Builder reports any defect found in the values (for example contrast failures) rather than editing the contract file; Lead decides.

## Rework addendum (Lead decisions after first audit)
Write scope widened to include `contracts/ui/v1/theme-defaults.v1.json` and a new short `docs/03-contracts/ui-ux/theme-presets.md`.
1. **Fonts:** user font stacks may name any family made of identifier characters or quoted names, must end in a generic family, and are rejected if they contain `;`, `{`, `}`, `\`, `url(`, `@` or exceed a named maximum length.
2. **Text scale range 0.5 to 3** is approved as the accessibility range; test both boundaries and just outside them.
3. **Built-in presets** live in the defaults JSON under `presets`: `neon-lights` (default for every scope) and `neon-dark-mode`. They replace the old `dark-graph-paper` preset. `ThemeManager` gains `selectPreset(scope, presetId)` and `listPresets()`; preset selection is the layer between application defaults and user theme. Palettes and mapping are in the rework message; every derived color records its source palette color in `theme-presets.md`.
4. **JSON defects to fix:** rename `text.scrollbackPause` to `interaction.client.scrollbackPause`; `ansiColorPolicy` value `mapped` becomes `adapted` (contract values: honored, adapted, ignored); the file's validation text says non-negative finite for dimensions; contrast: `color.border.normal` at least 3:1 on every surface of both presets, `color.map.room` at least 3:1 on panel, terminal `ansi0` and `ansi8` at least 3:1 on the terminal background. After the fix drop the old names from `schema.ts`.
5. **Layout measures** (content max width, page margin, stack gap, heading line height) become tokens: `layout.contentMaxWidth`, `spacing.page`, `spacing.stack`, `font.lineHeight.heading`, `font.lineHeight.body`. Lead adds `layout.*` and `font.lineHeight.*` to the contract's namespace list.
6. Home and host inherit editor defaults only: approved.
7. The hand-written token-type table stays the single type source. Add a reverse-drift test: every token family in `schema.ts` that the file is required to provide must exist in the file.
