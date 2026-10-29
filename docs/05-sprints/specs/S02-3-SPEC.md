# S02.3-SPEC — Launch screen: splash, Create/Play/Host entries, appearance switch

**Status:** APPROVED, IN PROGRESS
**Owner:** Home workspace (HomeIntentRouter) on the shared UI library; shell commands owned by the Tauri shell
**Approved TDDs:** [00-launch-and-workspace-navigation.md](../../03-contracts/ui-ux/00-launch-and-workspace-navigation.md) (Launch and routing, Toolbar sections); [02-interaction-state-and-accessibility.md](../../03-contracts/ui-ux/02-interaction-state-and-accessibility.md); [home-controls.v1.json](../../../contracts/ui/v1/home-controls.v1.json) surface `home.splash`; S02.1 ThemeManager; S02.2 shared UI.
**ADRs:** none open.
**Predecessors:** S02.1, S02.2 DONE.
**Phase tracker:** S02.3a, S02.3b, S02.3c in [SPRINT-TRACKING](../../SPRINT-TRACKING.md#s02). One Builder, one Auditor; the Auditor gives a verdict per slice.
**Implementer write scope:** `app/src/**` (new `app/src/home/`, `App.tsx`, `main.tsx`), `app/src-tauri/src/**` and `app/src-tauri/Cargo.toml` (shell commands only), `app/src-tauri/capabilities/**` (minimal), `contracts/ui/v1/home-controls.v1.json`, `contracts/ui/v1/actions.v1.json`, `contracts/ui/v1/INDEX.md` (counts) and registry tests that assert catalog counts. Nothing else.
**Out of scope:** workspace routing and shells (S02.4), recent items data (S04, S09), host supervisor (S17), saved preferences (S02.9), any fake projects, worlds, hosts or engine state.

## Objective
The first real MudMaker screen: honest startup status and the three workspace entries, plus a live switch between the two color presets so both can be tested. Nothing on it pretends a subsystem exists.

## S02.3a Loading and splash screen
- On launch show a loading state while real checks run, then the splash. Checks, each actually executed and shown in the status list with pass or fail and a plain reason on fail: shell responds (`app_info`), interface catalogs validate (the S02.2 registry load), theme resolved (shows the active preset name), game engine (`engine_status`).
- New shell command `engine_status` returns a typed result computed on disk: whether the engine sidecar executable exists at the path the shell expects (path from one named constant in the shell), with reason text. In this build it reports not installed. Rust unit test with a temporary directory proves both found and not found.
- Splash shows: product name, version and build id from `app_info` (catalog controls home.splash.01 to .03 as passive status, with accessible labels). A startup failure shows an error state with a Retry control and the exact failed check; nothing silently continues.
- A failed registry load or invalid catalog must surface as a visible error, not a blank window.

## S02.3b Create, Play and Host entries
- Controls home.splash.04 to .06 (Create, Play, Host) rendered from the catalog through the S02.2 primitives. No handler exists yet because routing is S02.4, so activating one returns the bus's `unavailable` result, shown as a Toast with plain copy ("Create is not available in this build yet." and equivalents), announced to assistive technology. Do not register fake handlers.
- Controls home.splash.07 and .08 (Recent Projects, Recent Worlds): shown disabled with the reason "No recent projects yet" and "No recent worlds yet" in the tooltip. Passive status home.splash.09 and .10 (Background Hosting, Connected Worlds) state the truth available today: hosting and connections are not available in this build.
- Add one new control and action for exiting: a Quit control (new catalog entry on `home.splash`, new `ui.app.quit` action owned by the home router) that calls the existing `quit_app` shell command through its handler. Update catalog index counts and tests.

## S02.3c Appearance preset switch
- A new catalog control on `home.splash` (new action `ui.settings.appearance.preset`) renders a Dropdown listing `ThemeManager.listPresets()`; choosing one calls `selectPreset` for all scopes (editor, client, host, home) through the action bus handler, and the whole screen updates immediately with no reload. Selection is shown only after the ThemeManager confirms.
- Plain text beside the control states that the choice is not saved after closing the app yet. No persistence in this phase.
- Both presets must render the whole screen readably; the status, focus ring, disabled and toast states are visible in each.

## Acceptance criteria
- AC-01 Every `home.splash` catalog control is rendered or its absence is explained by a visible state; every rendered control has its catalog test id as `data-testid`, accessible name, tooltip/help and keyboard path. New controls and actions validate with the S02.2 registry and updated counts.
- AC-02 Startup checks are real: a test makes each check fail in turn (mocked shell error, invalid catalog, missing theme) and the error state and Retry appear naming that check. `engine_status` Rust tests pass.
- AC-03 Create, Play and Host show the unavailable Toast once per activation (rapid double activation does not stack duplicates) and no navigation occurs.
- AC-04 Switching presets updates the CSS variables on the document root and the dropdown value after confirmation only; both presets pass an automated check that rendered text, controls and status colors used on this screen meet the contract contrast floors; the screen has no literal colors, sizes or fonts.
- AC-05 No text on the screen contains sprint IDs, jargon, emojis or em dashes. Tab order is logical: Create, Play, Host, Recent Projects, Recent Worlds, appearance control, Quit. Landmarks and a single h1.
- AC-06 `npm --prefix app run build`, filtered vitest, and `cargo test` for the shell command pass. The launch itself is verified by the Lead and owner (stakeholder protocol).

## Verification cost plan
**Builder verification:** `npx vitest run src/home src/ui src/theme src/App.test.tsx` in `app`; `npm --prefix app run build`; `cargo test --manifest-path app/src-tauri/Cargo.toml` filtered to the new tests (`engine_status`, `app_info`). No other runs.
**Auditor scope:** per-slice verdicts for S02.3a, S02.3b, S02.3c against this spec and the cited contracts; rerun the same commands once; judge jsdom overclaims; check the catalog/schema/INDEX edits, the Rust command and capabilities (minimal permissions), hand-copied data, literals.
**Full suite:** NOT REQUESTED. **Regression surface:** S02.1 and S02.2 tests, catalog count tests.
**Test oracle:** catalog file for controls and ids; contract text for copy rules; WCAG formulas as in S02.1 tests.

## Stakeholder hands-on protocol (Lead launches with `npm run dev`; owner tests)
1. The window shows a brief loading status then the splash with MudMaker, version 0.1.0, the build id and a status list where each check says what it verified; the engine line says it is not installed.
2. Press Create, Play, Host with mouse, then with keyboard (Tab, Enter or Space): each shows a short message that it is not available yet; nothing navigates.
3. Recent Projects and Recent Worlds are disabled; hover and keyboard focus show why.
4. Use the appearance control to switch between Neon Lights and Neon Dark Mode. Judge colors, text readability, focus ring visibility, disabled and message states in both. Note the text saying the choice is not saved.
5. Press Quit (and try again closing with the window close button). The process ends.
6. Resize the window narrow and wide; layout stays readable.

## Risks
Catalog and action table edits are contract edits: the Builder adds only the three entries named here and reports any other catalog defect. The engine sidecar path constant is a placeholder location in the shell until S03; document it where the constant is defined.

## Rework addendum (Lead decisions after first audit)
- **Slices:** S02.3d Diagnostic log joins this dispatch. Allowed catalog additions are now four: Quit (home.splash.11), Appearance (.12), **Retry (home.splash.13, action `ui.app.retryStartup`, owned by the home router)**.
- **Retry:** appears only for failures a retry can fix (shell, theme, engine). It is a catalog control rendered by the shared Button and activated through the shared Input Manager, with tooltip, test id, Enter and Space tests, and focus moved to the failure alert when it appears and back to the heading after a successful retry. **A catalog load failure never shows Retry** (the catalogs are bundled and cannot change at run time): it shows a plain message that this installation is damaged and MudMaker should be reinstalled, with no control. No native click handlers remain in `app/src/home`.
- **Failure copy:** plain friendly sentences per failed check; no ids, no raw exception text on screen. Raw detail goes only to the diagnostic. The copy scan covers loading and every failure state.
- **Diagnostics:** the shell generates one random launch id per app start (smallest suitable dependency or std; report the choice) and returns it from `app_info`; every UI diagnostic carries it as correlation. UI diagnostics gain `severity` (`error`, `warning`, `info`); a refused action because no owner exists yet (expected unavailability) is `info`. A new shell command appends each diagnostic as one JSON line to a bounded log file in the app data directory (rotation by size with named constants, no unbounded growth, a failure to write never blocks the UI, safe messages only, never credentials). Rust tests with a temporary directory prove append, rotation, and write failure handling. The UI sink forwards to the shell and still prints to the console in development only.
- **Feedback duplication:** one visible message and one announcement. Keep the Toast and the bus announcement; the Toast gets an option for no live role when the bus already announced it; the shared Button gets an option to hide its inline state text when a Toast carries the message. Tests assert there is exactly one live announcement per refusal.
- **Smaller:** correct `contracts/ui/v1/INDEX.md` text ("not all 367") and derive or test that sentence against the real counts; remove the blank line at the end of homeLayout.ts; reuse the shared `copy.notInThisBuild`; add a StrictMode render test for startup; make the Toast location check meaningful or drop the claim; test rapid activation across awaits, not only two synchronous clicks.

