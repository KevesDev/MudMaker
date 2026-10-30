# S02.3e / S02.3f SPEC — Production-only launch screen and its design

**Status:** APPROVED, IN PROGRESS
**Owner:** Home workspace (HomeIntentRouter) on the shared UI library
**Approved TDDs:** [00-launch-and-workspace-navigation.md](../../03-contracts/ui-ux/00-launch-and-workspace-navigation.md); [02-interaction-state-and-accessibility.md](../../03-contracts/ui-ux/02-interaction-state-and-accessibility.md); [editor-theme-manager.md](../../03-contracts/editor-theme-manager.md); [S02-3-SPEC.md](S02-3-SPEC.md) (what exists today).
**Predecessors:** S02.1 to S02.3d DONE. Owner feedback from the first hands-on (2026-10-29): the screen shows diagnostics and not-yet-real content, and looks unfinished in a small column.
**Phase tracker:** S02.3e, S02.3f in [SPRINT-TRACKING](../../SPRINT-TRACKING.md#s02). One Builder; the Auditor gives a verdict per slice.
**Implementer write scope:** `app/src/home/**`, `app/src/App.tsx`, `app/src/main.tsx`, `app/src/theme/**` and `contracts/ui/v1/theme-defaults.v1.json` + `docs/03-contracts/ui-ux/theme-presets.md` + `docs/03-contracts/editor-theme-manager.md` only to add tokens the design needs (S02.1 process: documented, contrast and derivation tests green for both presets), `contracts/ui/v1/home-controls.v1.json` and `ui-control.schema.json` only for `visibleWhen` handling, `app/src-tauri/tauri.conf.json` (window default and minimum size), registry/drift tests that assert catalog facts. Windows is the only target.
**Out of scope:** navigation to workspaces (S02.4), recents data, hosting and connection status data, persistence of the appearance choice (S02.9).

## Rule for this and every later screen
Anything rendered must be production UI. Internal checks, build facts beyond the version line, and features without a real data source are logged, not shown.

## S02.3e Production-only launch screen
- **Startup checks:** keep running the real checks, but their outcome goes only to the diagnostic log (S02.3d): `info` for passes, `warning` for the engine not being installed. While checks run the screen shows only a brief friendly loading state (name and a progress indicator). On success nothing about checks is shown. On a blocking failure the existing plain-language failure screen with Retry remains.
- **Engine check is non-blocking for now:** a single named setting (`STARTUP_REQUIRES_ENGINE`, false until the engine ships; tracker S03.4 makes it true) decides whether a missing engine fails startup. Tests cover both values (true: friendly failure screen and Retry; false: logged warning, normal splash).
- **Remove from the screen:** the Loading Status checklist (home.splash.03 only while loading or failed, per catalog `visibleWhen`), Recent Projects and Recent Worlds (home.splash.07 and .08, until real data exists), Background Hosting and Connected Worlds (home.splash.09 and .10, shown only while hosting or connections exist). The catalog entries stay; their `visibleWhen` conditions must match this behavior (adjust within the schema or extend the schema enum with a drift test), and the registry/count tests stay green. No empty disabled placeholders.
- **Unavailable message:** Create, Play and Host still say they are not available until S02.4 wires navigation. The message is one plain sentence ("Create is not available yet.") without a "Note:" label or engineering wording, announced once.
- **Appearance switch** stays as a labelled control with the not-saved note (it moves to Settings in S02.9). Remove the duplicated "Appearance" heading and label.
- Tests: no check result text, check names or catalog ids appear on the success screen; log records exist for every check with severity and the launch id; hidden controls are absent from the DOM and from the tab order.

## S02.3f Launch screen layout from documented content (revised)
**Source rule (owner, 2026-10-29): use the existing UI/UX documents; do not invent.** The documents ([00 launch](../../03-contracts/ui-ux/00-launch-and-workspace-navigation.md), [UI catalog](../../../contracts/ui/v1/INDEX.md) `home.splash`, [ThemeManager](../../03-contracts/editor-theme-manager.md)) define the splash content as: MudMaker wordmark, semantic version and build, loading or recovery notice (only when loading, recovering or failed), Create, Play, Host, and persistent hosting status only while a host runs. They define no cards, taglines, descriptions or layout art. This slice therefore adds none.
- Content is exactly the documented splash content plus the temporary Appearance and Quit controls already in the catalog. Labels, and any help text, come from the catalog entries. No new visible copy is written.
- Layout only: use the available window and the existing tokens (surface, spacing, font sizes, shape, border, interaction colors) so the screen is centered, properly scaled and readable in a full window, with Create, Play and Host as the primary controls in the documented order. Any token needed for scale (e.g. a display size for the wordmark) is added through the S02.1 process and documented; no literals.
- The layout reflows without horizontal scroll down to the minimum window size set in `tauri.conf.json` (default and minimum window size from named configuration).
- Accessibility unchanged or better (Tab order Create, Play, Host, Appearance, Quit; one h1; landmarks; visible focus; contrast tests extended to new styles). Reduced motion removes transitions.
- Tests: layout class change at the token-defined breakpoint, style contrast and literal scans, no console errors, and that no visible text exists outside the catalog labels and documented loading/failure copy. State what jsdom cannot prove.
- Any further visual design (hero art, cards, imagery) requires a design document from the owner and is not built here.

## Acceptance criteria
- AC-01 No diagnostic or placeholder text on the loaded launch screen; every check has a log record; failures still show the plain failure screen with Retry.
- AC-02 `STARTUP_REQUIRES_ENGINE` both values tested; default false.
- AC-03 Hidden catalog controls are not in the DOM; catalog drift and count tests updated and green.
- AC-04 Wordmark, version line and controls render from tokens in the documented order; both presets pass contrast and literal scans; layout reflows at the narrow breakpoint; no invented copy.
- AC-05 Create, Play, Host announce the unavailable sentence once each activation.
- AC-06 Filtered vitest, build and `cargo test` green; copy follows the product rules (plain, no sprint IDs, jargon, emojis, em dashes).

## Verification cost plan
**Builder verification:** `npx vitest run src/home src/ui src/theme src/App.test.tsx src/appInfo.test.ts`, `npm --prefix app run build`, `cargo test --manifest-path app/src-tauri/Cargo.toml` only if Rust changed.
**Auditor scope:** per-slice verdicts for S02.3e and S02.3f.
**Stakeholder hands-on:** Lead launches with `npm run dev`; owner judges the look in both presets, window resizing, keyboard use, unavailable messages, Quit.
