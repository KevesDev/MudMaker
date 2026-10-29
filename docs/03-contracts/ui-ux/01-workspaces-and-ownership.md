# 01 — Workspace separation, authority and data ownership

## Routes (product decision)
`Home` chooses three distinct workspaces: **Create/Edit** → Creator Editor; **Play** → Player Client; **Host** → Host Operations. A user can open several windows and play a game they host, but each uses separate scoped permissions, window layouts, input focus and persistence. Host/Editor actions are never made available inside a remote game's supplied metadata. Closing a game connection does not discard local edits or edit project files. All player-client connections terminate on leaving Play; hosting may remain active across workspace switches only while MudMaker remains open.

| Workspace | Data owned / can mutate | Data it must never own |
|---|---|---|
| Home & Library | local recent projects, saved remote profiles, favorites, app updates and global preferences | game ECS state, script grants |
| Creator Editor | host-local project drafts, asset graph, map/quest/UI definitions, autosave/undo, build/publish request | remote session login or client transcript, production ECS memory |
| Player Client | personal server profiles, screen/transcript layout, local aliases/triggers/hotkeys, private navigation map, connection state | server's game state, project definitions, script DLLs |
| Host Operations | explicit local host release selection, start/stop, backup/recovery, network/security settings and moderator controls | player-side UI preferences, remote clients' script source |
| Native world host | authoritative ECS, authenticated actor commands, journal/outbox, visibility, game-defined UI metadata | client's local toolbar macros, personal map notes and text colors |

## Capability and process boundaries
- `SharedUI`: only primitives, token-aware rendering, accessibility semantics, layout/docking serialization, dialogs/notifications, command registration **interface**, keyboard and pointer focus mediator, safe text renderer. Shared library **must not depend** on ECS, network codecs, project store or scripting worker.
- `EditorApp`: `ProjectService`, `AssetService`, `EditorIntentRouter`, `EditorUndoStack`, `BuildAndPublishService`, map/blueprint/graph/quest inspectors. **No direct call into active player's input handlers.**
- `ClientApp`: `ProfileStore`, `ConnectionSupervisor`, `ProtocolAdapters`, `TranscriptStore`, `ClientIntentRouter`, `LocalAutomationEngine`, `PersonalMapStore`, `ClientPreferenceScope`. **Never import project authoring commands.**
- `HostAdminApp`: `LocalHostSupervisorAPI`, `HostAdminIntentRouter`, security/backup telemetry; permission-gated. Sharing process executable is permissible, but dependency graph is acyclic and forbidden imports tested. A "Play Test" runs Player Client against a real isolated test host with explicit role and return-to-editor control; **it is not an editor inspector that changes ECS directly**.
- `GameUIProjection`: separate **allowlisted read-only server capabilities**, e.g. health bars, location/exit hints, inventory/quest summary, from MudMaker protocol. Host content may **suggest** presentation, but cannot invoke privileged native client actions, impersonate login or set global theme.

## Interfaces and event direction
```text
input device -> SharedUI FocusMediator -> WorkspaceIntentRouter
  Editor -> EditorCommands -> ProjectService -> draft/undo/publish
  Client -> ClientActions -> ProtocolAdapter -> authenticated game or external telnet
  Host   -> HostAdminCommands -> LocalSupervisor -> selected release
network -> ProtocolAdapter -> SanitizedClientEvents -> transcript/map/notifications
world host -> authorized game projection -> client (no editor content)
```
`UIActionDescriptor` contains stable action ID, owner workspace, required capability, enabled predicate, keyboard scope, state selector, help key, telemetry category and test ID. Command bindings and layout panels point to this descriptor; there is **no duplicate per-widget command logic**. Remote protocol data cannot define arbitrary `UIActionDescriptor`.

## Persistence scope
- App global: locale, access needs, recent profiles, security trust defaults.
- Editor: theme selection and overrides, panel layout, editor shortcuts, project UI state; project world data is separately versioned and publishable.
- Client: global display/theme, per-server/per-character overrides (hotkeys, triggers, mapper, filters, logging opt-in), safe connection credentials in OS keychain where available; not exported without redaction.
- Host: local server settings, monitoring layout and admin history (separate privileged configuration). Hosting persists when navigating to Create, Play, or Splash, but stops when MudMaker exits. Only one active hosted world is permitted.
- Presentation metadata from MudMaker host cannot overwrite user settings, enable automation or install assets. All files have schema version, validation, atomic save and rollback on malformed import.

## Session lifetime rules
- Leaving Play for Create, Host, or Splash requires **Disconnect & Switch** or **Cancel** when connected. No player session, network socket, or background transcript stream survives the switch. Local preferences and unsent drafts may persist for later explicit reconnection.
- Leaving Host does not automatically stop a running host. The Host supervisor remains owned by the application process. Exiting the application stops the host and disconnects its players; canceling exit leaves it running.
- On Splash, display `Active World: {world}` only while hosting. Do not show Connected Worlds or an idle-host status.

## Threat/UX tests
- Malicious remote game sends label pretending to be 'Delete Project', `commandId=host.stop`, theme hex, or local file path ⇒ inert data/no UI action.
- Editor and Client both open; Ctrl+Z in client composer does **not** undo world map, typing code in Editor doesn't send player commands.
- Login to external MUD remains usable when no MudMaker server exists; map is never populated with authoritative Editor room IDs.
- Permissions are checked **by owner service**, not UI hide/disabled state. Focus changes and reconnect never repurpose a shortcut across workspaces.
