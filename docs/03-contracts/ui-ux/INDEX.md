# MudMaker UI/UX v1 — Agent Navigation

**DECIDED product and architectural contract; NOT IMPLEMENTED.** One common interaction/accessibility/rendering toolkit, **three isolated workspaces**: **Creator Editor**, **Player Client**, **Host Operations**; plus **Home/Library** as a route selector. Every user may create, self-host, and play worlds; **Player Client connects to MudMaker servers AND non-MudMaker MUDs** via separate transport adapters. The Editor never processes remote gameplay commands.

| Agent objective | Read only |
|---|---|
| Identify owning application, state/command boundary, global navigation | [01 workspaces and architecture](01-workspaces-and-ownership.md) |
| Implement an action, input, notification, modal, focus or reusable widget | [02 shared interaction primitives](02-interaction-state-and-accessibility.md) |
| Build/edit themes, theme imports, text rendering, color semantics | [03 ThemeManager and preferences](03-theme-and-preferences.md) + [authoritative theme contract](../editor-theme-manager.md) |
| Implement Editor navigation/inspector/graph/map/command/quest UI | [04 Editor workspace](04-editor-workspace.md) |
| Implement playable Client transcript, settings, hotkeys, profiles | [05 Player Client workspace](05-player-client-workspace.md) |
| Connect to third-party telnet/WebSocket MUDs | [06 external protocols](06-external-mud-protocols.md) |
| Build automatic mini mapper, player-local aliases/triggers | [07 mapper and automation](07-mapper-and-automation.md) |
| Check every screen/panel/control/action/tooltip and no orphan elements | [Machine UI registry](../../../contracts/ui/v1/INDEX.md) |
| Test UX, input boundary, editor/client isolation | [08 UX matrix](08-ux-test-matrix.md) |
| Distinguish researched precedent vs MudMaker decision | [09 research and sources](09-client-research.md) |

**Source of truth / agent budget:** UI controls and their implementation linkage live in *one of four machine-readable UI catalogs*, partitioned by workspace (see catalog index); this page only routes. Do not load all catalogs, all feature pages, or the entire project. New visible elements must get stable UI IDs and catalog entries **as part of the phase creating them**, including visible text, tooltip, state, action, authority and test. A missing entry is an audit FAIL, not a reason to invent another UI manager.

**Phase sequencing:** **S00** researches/decides UI, creates indexes and closes documentation gates; **S01** freezes actual client UI runtime/platform and engine interfaces; **S09** implements shared UI shell, ThemeManager and Editor foundation; **S08** completes safe MudMaker network transport (separate from external-MUD adapters); **new S09C Client Toolkit** implements non-MudMaker adapters, profiles, transcript, input, mapper and automation using approved UI primitives; **S10–S12Q** Editor feature screens; **S13** host operations; **S14** human and cross-platform acceptance. See [single tracker](../../SPRINT-TRACKING.md) and [one spec per sprint](../../05-sprints/specs/INDEX.md).

### Absolute rules
- **One ThemeManager service/schema, independent resolved scopes** `editor` and `client`, plus `host` inheriting editor semantic system; user can customize each separately. **Never force a game theme on a player's UI**.
- One input routing core with separate `EditorIntentRouter`, `ClientIntentRouter`, `HostAdminIntentRouter`. Core deals with focus/key/gesture dispatch, **not gameplay authorization**.
- Every visible action is registered once as a semantic `ActionId` and routes to exactly one authorized owner. One component library (button, field, dialog, menu, panel, toast, virtualized transcript) consumes ThemeTokens; do not build independent widget families.
- **Player Client not bound to the MudMaker ECS**: third-party servers are opaque peers. External rooms cannot be read as internal `EntityRef`; mapper evidence has confidence levels.
- Every server/host-provided title/text/ANSI/GMCP/MXP is **untrusted data**. No remote server package/autoinstall scripts, arbitrary HTML, file operations, client theme override or host-editor actions.
- Default Editor graph canvas remains **subtle dark continuous graph-paper lines** (never dots). Player mini mapper is a distinct player-local navigation visualization, not an Editor cell grid.
