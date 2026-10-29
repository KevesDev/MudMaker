# S01.7-SPEC — Platform launch smoke test

**Status:** APPROVED, IN PROGRESS
**Owner:** Application shell (Tauri host process + React frontend)
**Approved TDDs:** [ADR-RECORDS-S01](../../07-decisions/ADR-RECORDS-S01.md) (ADR-005, versioning); [00-launch-and-workspace-navigation](../../03-contracts/ui-ux/00-launch-and-workspace-navigation.md) (Loading/Splash section only)
**ADRs:** ADR-005 decided. No OPEN blockers for this phase.
**Predecessors:** S00 10/10; ADR records landed.
**Phase tracker:** [S01.7](../../SPRINT-TRACKING.md#s01)
**Assigned Builder:** one builder, sonnet medium. **Auditor:** one independent auditor, sonnet medium.
**Implementer write scope:** `app/**`, `scripts/**`, root `package.json`, root `VERSION`, root `.gitignore`. Nothing under `docs/`.
**Out of scope:** engine, database, workspaces beyond a launch screen, theme system (S02.1), Input Manager (S02), navigation (S02.4), model wizard.

## Objective
A real native MudMaker window, started by one command, that shows honest build facts and exits cleanly. It is the base that S02 builds on, so layout must follow the ADR-005 structure: `app/` holds the Vite React TypeScript frontend and `app/src-tauri/` holds the Rust shell.

## Deliverables
1. Root `VERSION` containing `0.1.0`. Script `scripts/check-version.mjs` fails (non-zero, names the file) if `app/package.json`, `app/src-tauri/Cargo.toml` or `app/src-tauri/tauri.conf.json` differ from it. `npm run version:check` runs it.
2. Tauri 2 + React + TypeScript + Vite project in `app/`. Product name `MudMaker`, window title `MudMaker`, identifier `dev.mudmaker.app`. Strict TypeScript, no `any`.
3. A Tauri command `app_info` returning `{ name, version, buildId, platform, arch, profile }`. `version` comes from the compiled Cargo package version; `buildId` is the short git hash captured at build time by `build.rs`, or `unknown` when git is unavailable. No hand-typed duplicates of these values in the frontend.
4. The window shows the MudMaker name, version, buildId, platform and arch, plus an honest status line: "Game engine: not installed in this build". No Create/Play/Host buttons and no fake world data (those arrive in S02.3 and later).
5. A **Quit** button calling a Tauri command that exits the process, and normal window-close also exits. No orphan process remains.
6. One-command launch: `npm run dev` at repo root runs `npm --prefix app run tauri dev`. Root `package.json` also provides `npm run build` (`tauri build` with no bundling beyond what the platform needs, unless installer works out of the box) and `npm run version:check`. `README` is not edited by the Builder; Lead documents it.
7. `.gitignore` covers `node_modules`, `dist`, `target`, `src-tauri/gen`, build output. Do not touch other tracked files.
8. Source comments short and timeless. No emojis, em dashes or sprint IDs in user-visible text.

## Acceptance criteria
- AC-01 `npm run version:check` passes at 0.1.0; after temporarily editing one file to 0.1.1 it fails naming that file (Builder reverts the edit).
- AC-02 `npm run dev` from repo root opens a window titled MudMaker showing version 0.1.0, a non-empty buildId, platform windows, arch.
- AC-03 Quit button and window close both end the process (verified by checking the process list).
- AC-04 `app_info` unit test in Rust asserts the version equals `env!("CARGO_PKG_VERSION")` and `buildId` is non-empty. One vitest asserts the frontend renders the values returned by a mocked `app_info` and the engine-not-installed line.
- AC-05 `npm --prefix app run build` (frontend typecheck and bundle) and `cargo check` in `app/src-tauri` succeed with zero warnings treated as errors.

## Verification cost plan
**Builder verification:** `npm run version:check`; `cargo test --manifest-path app/src-tauri/Cargo.toml app_info`; `npx vitest run` in `app` (that one file); `npm --prefix app run build`. Launch once with `npm run dev`, confirm process starts, then stop it. No other runs.
**Auditor scope:** changed files only, against this spec and ADR-005; rerun the same filtered commands once; confirm no engine or world state is faked and no extra dependencies beyond Tauri 2, React, Vite, TypeScript, vitest and their direct testing needs.
**Full suite:** NOT REQUESTED. **Regression surface:** NONE (new files).
**Test oracle:** version and name are externally fixed (`VERSION` file, spec); buildId is compared to `git rev-parse --short HEAD`.
**Evidence budget:** counts and first actionable error only.

## Stakeholder hands-on protocol
1. In a terminal at the repo root run `npm install` (first time only) and then `npm run dev`. First launch compiles Rust and can take several minutes.
2. Expect a MudMaker window. Confirm it shows version 0.1.0, a build id, Windows and the architecture, and the line saying the game engine is not installed.
3. Press **Quit**. The window closes and no MudMaker process remains in Task Manager.
4. Run `npm run dev` again and close with the window X. Same result.

## Risks
Missing Windows prerequisite (WebView2, MSVC Rust target): Builder stops and reports the exact missing item; Lead resolves. Tauri project scaffolding may add template boilerplate; remove unused sample code so no template greeting remains.
