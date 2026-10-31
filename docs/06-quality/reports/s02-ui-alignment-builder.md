# UI alignment Builder report, 2026-10-30

Owner: existing workspace routers, Input Manager, shared Menu and ThemeManager; no ECS/runtime authority change. Awaiting independent audit.

| Acceptance | Evidence |
|---|---|
| AC1 Create layout | Existing CreateShell.tsx:73 and workspaceSurfaces.test.tsx:66–97 exercise the shared frame, Build/View, Assets and initially closed Problems/Inspector. |
| AC2 Play | workspaceSurfaces.test.tsx:100–157 covers profile validation/Cancel, connected frame, one drawer and Appearance grouping; WorldLibrary.test.tsx covers save/edit/delete. |
| AC3 Host | HostWorkspace.tsx:105–119 reuses five bordered choices and the empty catalog Project to Host selector; Network alone remains in Operations. workspaceSurfaces.test.tsx:160–206 proves primary selection and secondary route. |
| AC4 Contracts | UI docs 12–16 and contracts/ui/v1/INDEX.md reconciled for Build/View, five additions, profile copy, Host buttons and retained cues; JSON count independently computed: 48+148+114+64=374 controls, 294 distinct actions. WorkspaceToolbar.tsx:36 and Menu.tsx:105 group Timestamps inside Appearance. |
| AC5 Cleanup/race | InspectorTextInput had no consumer and is removed. startup.test.tsx:252–262 explicitly defers the first check then rejects it after announcement assertions, retaining mutation/retry assertions; startup tests 16/16 passed. |
| AC6 Verification | Typecheck/build passed; original filtered run had two timeouts, detailed below. Independent acceptance remains pending. |

Commands: app/ `npx tsc --noEmit` PASS; root `npm --prefix app run build` PASS (Vite warns about a chunk over 500 kB).
Exact prescribed filtered vitest command: 65 files passed, 1 failed; 956 tests passed, 2 timed out at 5000 ms, 958 total. Both failures were controlCoverage.test.tsx; no assertion failure was observed. The repaired startup and workspace files passed 16/16 and 8/8.
Lead-authorized `npx vitest run src/home/controlCoverage.test.tsx` rerun: 2/2 PASS, unchanged timeout/assertions, tests took 2813 ms and 2346 ms. Broad-run cause is not established. Auditor's lower-worker confirmation is pending; no further broad run made.
Changed code: HostWorkspace, hostLayout, WorkspaceToolbar, Menu, startup/workspace tests; deleted unused InspectorTextInput. No catalog JSON or theme values changed; touched files use LF. Unrelated local changes preserved.
Click steps: Create → Build; View → Assets / Test Output. Go To → Play → Add World → edit Name/host/port/TLS → Cancel; Settings → Appearance contains Timestamps. Go To → Host → Player Sessions / Traffic / Logs / Backups / Release; Operations → Network.
Launch after audit: root `npm run dev` invokes `npm --prefix app run tauri dev`. Lead observed no app/node/listener to stop. If that changes, stop only mudmaker.exe and the verified Vite owner of port 1420, then launch. No standalone executable build run.
Limits: no pixel, touch, screen-reader, native runtime or owner visual acceptance claimed. No unresolved architecture decision; audit verdict and independent filtered confirmation outstanding.

Repair after audit FAIL: ShellRouter.ts:30–33 now maps active destination to home/editor/client/host and invokes ThemeManager once, preserving all other scope selections. Replaced global-change/rollback tests with four destination/scope isolation cases and four refusal cases; home and real workspace menu tests assert the same boundary.
Repair verification: app/ `npx tsc --noEmit` PASS; `npx vitest run src/nav/ShellRouter.test.ts src/home/appearance.test.tsx src/nav/workspaceShell.test.tsx src/workspaces/workspaceSurfaces.test.tsx --maxWorkers=2` PASS, 4 files / 53 tests, no failures/skips, 13.39 s. No build or broader rerun performed after this repair; independent re-audit pending.
