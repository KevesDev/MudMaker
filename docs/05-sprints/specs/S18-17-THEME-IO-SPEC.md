# S18.17 — Theme import/export polish

**Status:** DEFERRED by owner to polish, 2026-10-31. Former S02.9c; partial implementation is parked, unfinished and unaudited. This remains required, but does not block S03 engine work. Resume with one Builder and one independent scoped Auditor when assigned.
**Owners:** ThemeManager validates and atomically imports appearance; PreferencesStore persists committed changes only; shared ShellRouter/InputManager owns local actions; one theme-file adapter owns selected-file reading and exported-file delivery. No world mutation, separate theme manager or general filesystem service.
**Predecessors:** S02.9a/b and global appearance correction audited; compact retro baseline at 3bec018 accepted by owner 2026-10-31. Preserve accepted geometry and Settings > Appearance > Theme. Tracker S18.17; ADR-005 decided, no affected OPEN gate. Earlier S02.9c labels/report filenames below identify the parked work, not completion.
**Binding:** editor-theme-manager.md, UI03 theme/preferences, UI02 input/focus, UI10/16 compact visual/copy rules, relevant UI catalogs/actions. Existing UserThemeDocument mudmaker.theme.v1 is a flat internal custom document; the portable app envelope below is intentionally distinct.

## Portable file contract

UTF-8 JSON, optional input UTF-8 BOM, exported with LF and no BOM. Default filename `mudmaker-theme.json`. One named file configuration caps raw and exported UTF-8 bytes at 256 KiB (four scopes x 176 token entries plus metadata fit comfortably; this is an appearance document, not preferences/history). Check selected File.size before reading and actual bytes before parsing; decode UTF-8 strictly. Cancellation is silent.

Exactly this root shape, with no additional root/scope fields:

```json
{
  "schema": "mudmaker.application-theme.v1",
  "presetId": "neon-dark-mode",
  "scopes": {"home": {}, "editor": {}, "client": {}, "host": {}}
}
```

All four scopes are required token maps. Values are string/number/boolean only, validated against existing owning scope schema/ranges/aliases. `presetId` must name an installed bundled preset. Each exported map merges only that committed scope's custom tokens and explicit overrides (override wins), retaining aliases and scope-only values; empty maps mean selected preset defaults. Do not export resolved accessibility adjustments, transient previews, full preferences, profiles, endpoints, credentials, unknown namespaces or the legacy backup. Do not flatten aliases or change bundled presets.

Unknown versions, unknown fields/scopes/tokens, prototype keys, malformed JSON/UTF-8, wrong types/ranges, missing keys, missing aliases/cycles and oversized files are rejected with exact field/scope/token and reason. Parsing is data-only; no eval, HTML, CSS or executable expressions. Extend the existing schema/validation owner instead of creating a competing token validator. Document the format in current UI03 and a machine-readable JSON schema under contracts/ui/v1; derive or drift-check scope names rather than silently duplicating them.

ThemeManager exposes one staged app-wide import operation: validate the complete envelope and every affected resolved scope before publishing anything, then replace the app-selected preset and tied custom layers atomically. Construct existing internal documents with stable internal identities; imported file data supplies no arbitrary identity/permissions. Every scope commits before listeners run, and PreferencesStore writes the existing appearance representation. Preserve unrelated preferences and the one-time legacy backup. Failed validation changes no committed inputs/render snapshot/preferences.

Export reads committed state only and has no mutation. Serialization/import/export roundtrip must retain custom shared and scope-only values, aliases and preset identity before accessibility adjustment. Same envelope applies from every workspace.

## UI and file delivery

Settings > Appearance > Theme exposes Import Theme and Export Theme everywhere. Migrate existing editor import/export actions to the shared shell owner/app appearance domain; retain one handler per semantic action and update catalog permissions/visibility/metadata/counts consistently. No new top-level menus or style changes.

Import opens the actual native browser file picker through a bounded file input (JSON filter), reads selected bytes, validates, then offers a compact Import Theme review dialog with filename/base preset and Apply/Cancel. State does not change until explicit Apply. Invalid data shows exact diagnostic paths/reasons without partial application; Cancel/Escape leaves the current theme untouched. Re-selecting the same file after an error must work. No raw JSON editor, status filler, success toast or fake game state.

Export delivers actual serialized bytes as a local file through the existing browser/Windows WebView capabilities (Blob/object URL with a controlled download path is allowed without a new dependency). Trace existing navigation/download suppression so an intentional local download is not silently blocked; preserve external-link/browser safety policy. Correctly release transient URLs without revoking before delivery. Do not claim disk success merely because a click/serialization returned. If native WebView file delivery is unsupported, report the concrete prerequisite before adding native plugins/commands or claiming completion.

## Acceptance and verification

- AC1: actual Import/Export routes exist in all four Theme submenus through one owner; accepted compact style remains intact and non-theme local controls remain local.
- AC2: exported bytes are captured as an actual downloaded file, parsed independently and inspected for the exact allowlisted envelope, absence of unrelated data, committed-not-preview state, aliases and scope-only values. Exported file is within limit and valid UTF-8 JSON.
- AC3: import those produced bytes into a changed/fresh real app/manager, Apply atomically, persist and restore. Compare preset and unadjusted custom values/aliases, while preserving unrelated prefs/legacy data. No fake successful file adapter as sole proof.
- AC4: invalid input families and canceled picker/dialog produce useful exact diagnostics or quiet cancel, and no partial render/committed/persistence mutation. One discriminating case per distinct risk; no padded near-duplicate tests.
- AC5: independent scoped Auditor PASS and produced-file evidence. Browser evidence does not imply Windows native-picker/download acceptance. Attempt real native workflow where tooling permits; record concrete limitations and leave owner file check pending if native delivery cannot be demonstrated. Do not label native file integration verified from serialization/jsdom.

Builder scope: relevant app/src/theme, prefs, home/nav and minimal existing composition/file-safety path/tests; relevant UI/action contracts and UI03. No packages, Rust/engine or arbitrary path access; report a real prerequisite first. Lead owns spec/index/tracker/history/handoff. Preserve unrelated .claude agent rule, deleted LICENSE and untracked settings. LF writes, no commit/push or standalone packaging.

Exact app commands: `npx tsc --noEmit`; `npx vitest run src/theme src/prefs src/nav/ShellRouter.test.ts src/nav/workspaceShell.test.tsx src/home/appearance.test.tsx src/home/controlCoverage.test.tsx src/workspaces/compactRetro.test.tsx src/workspaces/ownerCorrections.test.tsx src/ui/actions/contractDrift.test.ts src/ui/actions/ActionRegistry.test.ts src/ui/tokenDiscipline.test.ts src/colorLiterals.test.ts --maxWorkers=2`.
Root: `npm --prefix app run build` (frontend only). New tests under theme/prefs are included. One named checkpoint after implementation; focused red run of new test file allowed, targeted repair reruns only. If a safety file outside named scope must change, request its exact regression command before running it. No unfiltered suite.

Browser/native external bridges may be fixtures only at the real boundary; the production UI, file bytes, parser, manager, persistence and routes must remain actual. Use existing bundled browser tooling, no install. Capture the real downloaded file and roundtrip receipt under docs/06-quality/reports/assets/theme-io/. Avoid a native access prompt blocking indefinitely; keep any unavailable native interaction clearly separate.

Concise Builder report: docs/06-quality/reports/s02-9c-builder.md with ownership, AC/path/test and exact counts/commands, produced-file paths/hash, limits and owner clicks. Independent report under25 lines: s02-9c-audit.md. Lead updates status honestly, commits/pushes after sign-off, restarts dev app and gives a short Import/Export click list. User-test gate remains explicit when real native file delivery is pending.
