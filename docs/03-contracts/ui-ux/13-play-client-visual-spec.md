# 13 — Player Client visual specification

**Purpose:** terminal-centered standalone MUD client for native MudMaker and third-party MUDs. Apply [shared visual language](10-visual-language-and-shared-shell.md), [client behavior contract](05-player-client-workspace.md), and [client controls](../../../contracts/ui/v1/client-controls.v1.json).

## Layout and top toolbar
- **Single compact top toolbar**, same overall geometry as Creator and Host. Show real world/profile and connection status, appropriate connect/disconnect actions and small frequent text tools, then **Settings ▾** and **Go To ▾** in stable positions.
- **Settings ▾ → Appearance** for client-scoped terminal fonts, colors and themes; other local preferences grouped there, without separate styling infrastructure. **Go To ▾ → Create, Host, Splash/Home**. Current Play mode is marked in the shell rather than listed as a redundant action.
- **Virtualized transcript dominates** the window. Legible text, selectable history, search and concise status. **Composer immediately below** for command entry and protocol-appropriate modes. No banner cards or unrelated explanatory paragraphs.
- Mini Mapper, channels/tells, character/vitals, inventory/quests, notes, hotkeys/automation and connection diagnostics remain reachable through **contextual drawers, menus or optional focused regions**, not stacked permanent panels or a grid of tabs. Native structured widgets appear only when supported; plain third-party Telnet must not invent stats/map data.
- Real simultaneously open Play sessions may use a restrained session-only tab strip. Don't add tabs for every secondary feature. A wider user-configured layout is allowed but not the cluttered default.
- Maintain accessibility, actual server state, semantic actions, safe ANSI rendering, and client-scoped theme tokens.

## Leave-Play behavior
Go To another workspace or Home while connected prompts **Disconnect & Switch / Cancel**, identifying impacted worlds. Close **all** client sockets before completing navigation. Keep local unsent drafts/profile preferences when valid, but no background player connections, transcript streaming or implicit reconnect. An app-hosted world may remain up independently when the Player Client disconnects.

## Acceptance
Reading and entering commands requires no panel juggling. The primary transcript/composer remains prominent at all sizes; secondary tools are available without clutter; theme changes don't affect server authority. Existing [navigation guard](00-launch-and-workspace-navigation.md) remains binding.
