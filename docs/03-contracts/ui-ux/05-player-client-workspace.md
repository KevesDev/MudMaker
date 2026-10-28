# 05 — Player Client: MUD companion toolkit, not Editor

**Distinct application workspace** for connecting to **MudMaker-hosted worlds and third-party MUD servers**, without opening a project, compiling C#, or publishing anything. User has full local control over text appearance, command history, shortcuts, mapper and automation. The game server remains authoritative for game rules.

## Player Library / onboarding
**World List** shows saved game profiles (endpoint, port, adapter, TLS indicator, character label, last used, favorite, connection status), Create/New Profile, Import Profile (sanitized), Connect, Edit, Duplicate, Remove, test secure connection and search. Third-party world entry supports explicit host/port and **Telnet+TLS or explicitly opted-in plaintext** with clear risk warning; MudMaker servers use native typed protocol. No mandatory game-specific plugin required just to connect and read/send text. User may play multiple worlds in independent tabs/windows with per-world actions and status.

## Live game client (default layout)
- Header: world name/profile, connection state, Connect/Disconnect/Reconnect, characters, split layout, Help, Settings; alert on insecure transport.
- Central **virtualized transcript**: selectable/wrappable text, timestamps toggle, filters/search, copy/save selected, channel colors, server/system/error spans, scrollback buffer, jump-to-latest pill, scroll lock/read-old-messages behavior, easy font scale, per-line context menu (copy/highlight/report if supported). Do not force scroll while user reads history.
- Bottom **composer**: explicit mode selector `Command / Say / Emote / Roleplay / Whisper / Custom` **when the protocol supports typed operations**; for third-party opaque servers this is local command entry or optional configured prefix/template, **not a claim about remote command semantics**. Multiline composer, send/preview, draft restore, queue indicator, history (Up/Down only when appropriate for focus), tab completion and contextual syntax. Enter behavior configurable and visible; Ctrl+Enter/Send supports multiline, IME safe. **Input length never selects the mode.**
- Right collapsible docks: **Mini Mapper**, **Channels/Tells**, **Character/Vitals**, **Inventory/Quests** (only when trusted structured data exists), **Notes**, **Hotkeys/Triggers/Timers**, **Connection/Debug**. Empty/status panels explain when server cannot supply structured data and never fabricate health or a room ID.
- Optional toolbar: favorite commands/macros (user-configured), navigation arrows, logging toggle, notepad and text controls; custom user-hotkeys scoped per world and client, never editor shortcut namespace.

## Text and appearance toolkit
Profile-specific font family/size/weight/line-height/letter spacing, foreground/background, ANSI color mapping, dark/light/high contrast, timestamp format, paragraph spacing, scrollback retention, word wrap/fixed column, highlight/regex color rules with resource bounds, channel routing into tabs, prompt style, sound/desktop notification opt-in, streamer/privacy mode, copy as plain text. Logs opt-in/retention/export sanitized and redact local credentials. User can pin messages, search/copy with keyboard, select text without triggering game action. Separate output display from raw decoded text for future re-render when theme changes.

## Automation and input
Aliases, triggers, timers, keybindings and hotbuttons belong **locally to one client profile** (MUSHclient/Mudlet-style), with optional global templates. Provide visual edit forms, enable switch, active scope, conflict preview, import/export and "Dry run" tests. Timers and triggers have quotas and disabled-by-default auto-send for downloaded/imported profiles. Trigger can highlight, notify, route to channel pane, map exit hint, or (only with user trust approval) send a command; server cannot install automation on the client. For structured MudMaker games, local hotbuttons call permitted native action IDs; for other worlds send configured literal commands through adapter, no special privileges.

## Mapper
Docked mini map supports read-only view, follow-current location, zoom/pan, notes, discovered rooms/exits, one-way and special directions, bookmarks and optional path preview. Source hierarchy: MudMaker authorized structured location events → third-party structured room protocol data (GMCP when provided) → user-validated text observation/manual edits. Never pretend a generic game supplies coordinate-correct map. Unknown/disputed path is visibly uncertain. Click to walk only after explicit user action and server navigation support/trust; pending step/failed command cancels route, no silent spam. Map data is client-local profile data; it is *not* Editor world map authoring.

## Responsive behavior
Desktop: transcript primary, map/status side docks, command bar bottom. Tablet: transcript primary + one tabbed side panel/drawer, large Send/button and gesture alternatives; never let map overlay composer without dismiss. Screen reader: output region with user-configurable announcement rate, keyboard transcript browse, labeled command history and map room list alternative. Multiple text windows are user-configurable.

## External-server honesty
- Client can connect as a general MUD terminal, but advanced GUI/status/map is **capability-detected**, not assumed. GMCP can supply structured information; plain telnet may only supply lines and ANSI.
- Third-party game may not understand MudMaker typed `SubmitText`; user chooses local composer and adapter sends textual commands according to that world's own syntax, with no accidental second command generated by client.
- No remote MUD can open Editor, install executable plugins, override local theme, write files or silently enable triggers.
