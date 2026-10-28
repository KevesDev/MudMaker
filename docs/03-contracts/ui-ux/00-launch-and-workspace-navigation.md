# 00 — App loading, splash screen and safe workspace navigation

**Status: OWNER-DECIDED PRODUCT BEHAVIOR / NOT IMPLEMENTED.** This is the canonical entry point for *all* three workspaces and the rule for switching between them. [Workspace ownership](01-workspaces-and-ownership.md) defines which service is allowed to act; [UI action catalog](../../../contracts/ui/v1/INDEX.md) defines specific visible controls. UI switching **never implicitly closes host processes, editor drafts or client connections**.

## Launch and routing
```text
App launch → Loading (version/config/theme/profile validation and recovery)
    → Splash (MudMaker wordmark, semantic version/build, loading/recovery notice, Create / Play / Host)
    → selected workspace (Create Editor, Play Client or Host Operations)
Each workspace top toolbar: "Go To ▾" → Create | Play | Host | Splash
Current destination shown selected/non-action; other destinations available.
```
Startup is safe even when a previous host is configured: **do not silently start an internet listener** or reconnect a remote server merely because the launcher opened. If a background host is still running in the same app session, Splash and Host show persistent "Hosting: {world} — Running" state. Closing a UI view or using Go To must not destroy the host supervisor, profile store or editor document model.

## Top toolbar
Every Create, Play and Host workspace shows the same **Go To** dropdown in a stable discoverable location. Items: `Create`, `Play`, `Host`, and `Splash` / `Home`. The active workspace is checked and not redundantly navigable. Toolbar also shows a compact **Host Running** indicator if active, a Client connection indicator when applicable, and an Editor dirty marker only in Editor. The Host indicator may open Host after normal transition checks. Switches are explicit user gestures, not remote server-requested URLs or commands.

## Transition guard, exact precedence and choices
`WorkspaceNavigator.request(destination)` takes an immutable snapshot of **EditorDocumentSession**, **ClientConnectionSessions**, **HostSupervisorSession**; it asks each owning service for a **transition impact** and composes a single clear dialog when multiple affected resources exist. Returning to a workspace never assumes it was destroyed. Guard decisions run **before** any irreversible changes, with versions rechecked before commit.

| From and condition | User sees | Actions and expected result |
|---|---|---|
| Create, no dirty documents | immediate switch | Project remains open as background **editor session**; no silent discard |
| Create, unsaved draft and user is switching without closing project | optional non-blocking persistent dirty indicator; editor session stays open | **Switch & Keep Draft** (default), **Save & Switch**, **Cancel**; *Discard* available only via explicit Close Project or destructive operation with its own confirmation |
| Create, switching while save is in progress | pending save banner and transition guard | **Wait for Save & Switch** or **Switch with Draft Open** only if in-memory state retained; **Cancel**; never falsely show saved |
| Play, active remote game | modal shows specific world(s) and session consequences | **Keep Connected & Switch** (default where supported), **Disconnect & Switch**, **Cancel**. Keeping connection may continue receiving output through bounded background buffers; UI shows unread count. If platform cannot maintain background connection, state why and do not promise it |
| Play, unsent composer text | draft remains per-session even if disconnecting | **Keep Draft** automatically; if discarding explicit confirmation required; no duplicate send |
| Host, active hosted world | modal explicitly asks **"Keep hosting {world} in the background?"** and states player connections | **Keep Hosting & Switch** (default), **Stop Hosting & Switch** (requires second confirmation if players connected), **Cancel**. Keeping host retains listener, workers, ECS, players and logs; no restart |
| Host, starting/stopping/backup in progress | show truthful pending status, ask to leave view without cancelling operation | **Keep Operation Running & Switch** (if safe), **Stay Here**; disabling destructive stop while incompatible task runs |
| Host, stopped | immediate switch; preserve selected project/release | no lingering listener |
| Any destination with existing workspace session | restore existing tab, layout, cursor/selection and connection | no duplicate editor, listener, account or credential objects |
| App Exit with host running | distinct **Exit** guard, not a Go To guard | **Continue Hosting** is not offered if the app/process is truly exiting unless a supported persistent background host service is installed; explicit Stop & Exit or Cancel. No fictional background promise |

**Dialog priority:** Host active operation and connected-client outcomes are explicitly listed; show combined impacted resources, not multiple cascading blind prompts. Cancel preserves current view and all resources. An error during Save, Disconnect or Stop blocks final transition when user chose that operation; show error and allow retry or safe alternative. **No data is lost without an explicit final destructive confirmation.**

## Single active hosted project
`HostSupervisor` owns a **process-level exclusive hosting lease** (`hostedProjectId, releaseId, hostInstanceId, generation, status`) and accepts at most **one active hosted project** per running MudMaker application instance. State `Starting/Running/Stopping/Recovering` reserves the lease; a second project cannot be selected for hosting or started until the existing lease is fully released after clean stop/recovery. This is enforced in the supervisor backend under a lock/atomic compare, not only a disabled button in UI. Multiple clicks and races yield `HOST_ALREADY_ACTIVE` with `Go to Existing Host`, `Cancel`; optionally `Stop Existing Host…` with operator authorization. No silent replacement of running world, automatic project unload or port rebinding.

A user **may simultaneously**:
- host World A in the background;
- open/edit World B or several unrelated project drafts in Create, with local autosave/undo;
- connect to World A, World C, or an unrelated MUD in Play, using distinct client connection sessions.

But **may not host World B** until World A is fully stopped and released. Editing World A drafts while hosted does not modify the active immutable release; publishing changes requires the normal stop/validate/publish/restart flow. The Host screen may show "Hosting World A" and "Working on World B" without attempting an automatic host switch.

## Backend service separation
`WorkspaceNavigator` is a UI coordinator; it owns **no host socket, game ECS, C# worker, Editor undo stack or Client adapter**. It asks:
- `EditorSessionController.describeLeaveImpact()/save()/retainDraft()`;
- `ClientSessionController.describeLeaveImpact()/retainConnection()/disconnect()`;
- `HostSupervisor.describeLeaveImpact()/continueHosting()/requestStop()`.
These return typed state/result with revisions and cancellation/error. Shared UI draws prompts and transitions only after confirmed service results. The host service lifetime belongs to the application supervisor and is **independent from Host panel/window lifetime**. View switch never invokes generic `dispose()` on these service objects. The host singleton lease is release-safe, robust to crash/recovery and ports/permissions validated before listen.

## Real testable outcomes (NOT S00 "user tests")
These are **implementation-phase** acceptance gates. In S00, only check that this spec is decided, conflict-free and correctly linked; there is no runnable UI yet.

1. Splash shows name/version/three choices; every workspace has working Go To menu and correct active selection.
2. From Create with unsaved map, navigate Play and back, map edits remain; choosing Save confirms success before banner changes; Cancel loses nothing.
3. While connected to external MUD, Go To Create and choose Keep Connected; output buffers remain bounded, reconnect state truthful; return restores scroll/draft.
4. While hosting A with two clients, Go To Play → Keep Hosting: both clients remain connected and world clock continues; return Host displays same process, not duplicate.
5. Attempt to host B while A runs (including two simultaneous UI clicks): rejected at backend with `HOST_ALREADY_ACTIVE`; both Editor B and external Play remain usable.
6. With host A running, edit B in Create, play C in Play, return to Host A; no state/permission bleed.
7. Stop hosting while clients are connected: explicit second confirmation, graceful server receipts and shutdown; only then host B may be started.
8. Device/background limitation is surfaced if OS suspends sockets; app exit never promises hosting after process termination.
9. Accessibility: tab/keyboard/screen reader reaches Go To, splash choices and modal options; Escape means Cancel, focus returns to invoking control.

## Phase ownership
S00: decide/record and index (DOCUMENT REVIEW only); S02: splash/top Go To/common guard UI + Editor session retention; S08: Play connection/draft background retention; S17: exclusive host lease and real background hosting, correct stop confirmation/restart; S18: 3-workspace end-to-end and race/accessibility test. Exact small tasks and status: [tracker](../../SPRINT-TRACKING.md).
