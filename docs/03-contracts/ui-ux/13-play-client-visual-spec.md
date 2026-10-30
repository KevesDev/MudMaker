# 13 — Player Client visual specification

**Purpose:** terminal-centered standalone MUD client for native MudMaker and third-party MUDs. Apply [shared visual language](10-visual-language-and-shared-shell.md), [client behavior contract](05-player-client-workspace.md), and [client controls](../../../contracts/ui/v1/client-controls.v1.json).

## Layout and top toolbar
- **Single compact top toolbar**, same overall geometry as Creator and Host. Show real world/profile and connection status, appropriate connect/disconnect actions and small frequent text tools, then **Settings ▾** and **Go To ▾** in stable positions.
- **Settings ▾ → Appearance** for client-scoped terminal fonts, colors and themes; other local preferences grouped there, without separate styling infrastructure. **Go To ▾ → Create, Host** (no Home or Splash entry). Current Play mode is marked in the shell rather than listed as a redundant action.
- **Virtualized transcript dominates** the window. Legible text, selectable history, search and concise status. **Composer immediately below** for command entry and protocol-appropriate modes. No banner cards or unrelated explanatory paragraphs.
- Mini Mapper, channels/tells, character/vitals, inventory/quests, notes, hotkeys/automation and connection diagnostics remain reachable through **contextual drawers, menus or optional focused regions**, not stacked permanent panels or a grid of tabs. Native structured widgets appear only when supported; plain third-party Telnet must not invent stats/map data.
- Real simultaneously open Play sessions may use a restrained session-only tab strip. Don't add tabs for every secondary feature. A wider user-configured layout is allowed but not the cluttered default.
- Maintain accessibility, actual server state, semantic actions, safe ANSI rendering, and client-scoped theme tokens.

## Leave-Play behavior
Go To another workspace while connected prompts **Disconnect & Switch / Cancel**, identifying impacted worlds. Close **all** client sockets before completing navigation. Keep local unsent drafts/profile preferences when valid, but no background player connections, transcript streaming or implicit reconnect. An app-hosted world may remain up independently when the Player Client disconnects.

## Acceptance
Reading and entering commands requires no panel juggling. The primary transcript/composer remains prominent at all sizes; secondary tools are available without clutter; theme changes don't affect server authority. Existing [navigation guard](00-launch-and-workspace-navigation.md) remains binding.


## Complete registered-feature placement and access map

This section maps **every currently registered control** to a visual home. It is a **default-layout and discoverability contract**, not a requirement that every control be visible simultaneously. The canonical catalog continues to define action IDs, permission, states and tests; each listed ID retains its contract. No new feature or unregistered action is implied by a menu grouping. Menu destinations which require new UI controls must be registered during implementation.

### client.worlds

**Where:** Play → World Library (when no active session or via world switcher).

**Presentation:** Saved-world searchable list; selected profile details and secure connection form open inline/on focused screen.

**Registered features (12):** `client.worlds.01` Saved Worlds; `client.worlds.02` Add World; `client.worlds.03` Edit Profile; `client.worlds.04` Delete Profile; `client.worlds.05` Connect; `client.worlds.06` Test Connection; `client.worlds.07` World Search; `client.worlds.08` Adapter; `client.worlds.09` Server Host; `client.worlds.10` Port; `client.worlds.11` Use TLS; `client.worlds.12` Security Badge.

### client.game

**Where:** Top shared Play toolbar.

**Presentation:** World title/connection; connection actions and character selection nearby; secondary settings/help in menus.

**Registered features (10):** `client.game.01` World Title; `client.game.02` Connection; `client.game.03` Disconnect; `client.game.04` Reconnect; `client.game.05` Switch Character; `client.game.06` Game Settings; `client.game.07` Mute Sounds; `client.game.08` Help; `client.game.09` Toggle Side Panels; `client.game.10` Multi World.

### client.transcript

**Where:** Central transcript surface.

**Presentation:** Find/filter controls in narrow transcript header; line operations via selection/context menu; latest/unread only when useful.

**Registered features (12):** `client.transcript.01` Game Transcript; `client.transcript.02` Find in Transcript; `client.transcript.03` Copy Selection; `client.transcript.04` Export Log; `client.transcript.05` Show Timestamps; `client.transcript.06` Word Wrap; `client.transcript.07` Pause Follow; `client.transcript.08` Jump to Latest; `client.transcript.09` Channel Filter; `client.transcript.10` Highlight Rule; `client.transcript.11` Pin Line; `client.transcript.12` Unread Count.

### client.composer

**Where:** Fixed lower composer directly below transcript.

**Presentation:** Message and Send primary; modes only where native protocol supports; history/preview/queue contextual.

**Registered features (11):** `client.composer.01` Input Mode; `client.composer.02` Message; `client.composer.03` Send; `client.composer.04` Preview; `client.composer.05` History Previous; `client.composer.06` History Next; `client.composer.07` Complete; `client.composer.08` Clear; `client.composer.09` Size Counter; `client.composer.10` Send Queue; `client.composer.11` Restore Draft.

### client.mapper

**Where:** View → Mapper (collapsible right drawer).

**Presentation:** Map viewport with tiny pan/zoom header; manual confirmation/route tools in map context menu.

**Registered features (16):** `client.mapper.01` Mini Mapper; `client.mapper.02` Follow Me; `client.mapper.03` Zoom In; `client.mapper.04` Zoom Out; `client.mapper.05` Map Settings; `client.mapper.06` Add Note; `client.mapper.07` Bookmark; `client.mapper.08` Confirm Room; `client.mapper.09` Resolve Conflict; `client.mapper.10` Edit Exit; `client.mapper.11` Plan Route; `client.mapper.12` Start Auto Walk; `client.mapper.13` Stop Auto Walk; `client.mapper.14` Area; `client.mapper.15` Show Uncertain; `client.mapper.16` Location Confidence.

### client.panels

**Where:** View → Panels (one contextual secondary drawer).

**Presentation:** Channel/tells/vitals/inventory/quests/notes/hotbuttons/debug are menu selections for *one* detail drawer, not simultaneous tabs.

**Registered features (12):** `client.panels.01` Channels; `client.panels.02` Tells; `client.panels.03` Vitals; `client.panels.04` Inventory; `client.panels.05` Quests; `client.panels.06` Notes; `client.panels.07` Hotbuttons; `client.panels.08` Debug; `client.panels.09` Create Note; `client.panels.10` Split Output; `client.panels.11` Close Panel; `client.panels.12` Unavailable Data.

### client.automation

**Where:** Settings → Automation (focused view).

**Presentation:** Aliases/triggers/timers/hotkeys/buttons in one category selector; selected rule form and import/export/dry-run.

**Registered features (15):** `client.automation.01` Aliases; `client.automation.02` Triggers; `client.automation.03` Timers; `client.automation.04` Hotkeys; `client.automation.05` Buttons; `client.automation.06` New Rule; `client.automation.07` Edit Rule; `client.automation.08` Delete Rule; `client.automation.09` Enabled; `client.automation.10` Pattern; `client.automation.11` Reaction; `client.automation.12` Dry Run; `client.automation.13` Import Pack; `client.automation.14` Export Pack; `client.automation.15` Trust Warning.

### client.preferences

**Where:** Settings → Appearance / Input / Notifications / Privacy / Layout.

**Presentation:** Theme, fonts, ANSI, timestamps and text metrics under Appearance; avoid parallel Game Settings button.

**Registered features (16):** `client.preferences.01` Theme; `client.preferences.02` Customize Theme; `client.preferences.03` Font Family; `client.preferences.04` Font Size; `client.preferences.05` Line Height; `client.preferences.06` ANSI Colors; `client.preferences.07` Timestamps; `client.preferences.08` Notifications; `client.preferences.09` Screen Reader Mode; `client.preferences.10` Stream Privacy; `client.preferences.11` Send Key; `client.preferences.12` Edit Hotkeys; `client.preferences.13` Save Layout; `client.preferences.14` Reset Client Settings; `client.preferences.15` Import Preferences; `client.preferences.16` Export Preferences.

### client.navigation

**Where:** Top toolbar → Go To (Create / Host).

**Presentation:** No clickable Play item; if hosting, true host-active cue may remain; client-session indicators only while Play active.

**Registered features (7):** `client.navigation.01` Go To; `client.navigation.02` Create; `client.navigation.03` Play; `client.navigation.04` Host; `client.navigation.06` Host Running; `client.navigation.07` Connected Sessions.

### client.navigationGuard

**Where:** Go To while connected → Disconnect & Switch / Cancel dialog.

**Presentation:** List affected sessions; preserve local drafts; never Keep Connected & Switch.

**Registered features (4):** `client.navigationGuard.01` Connected Games; `client.navigationGuard.03` Disconnect and Switch; `client.navigationGuard.04` Cancel; `client.navigationGuard.05` Unsent Draft.

## Visual audit rule for this workspace

A Builder must demonstrate a discoverable route to each registered feature, with valid disabled/error states and keyboard access, without promoting every control to the main toolbar or leaving every panel visible. Existing contract-mandated tabs represent document/session or contextual mode switching; default navigation must not become a permanently stacked tab wall. Any mismatch between this map and a feature contract is resolved through an explicit indexed documentation change, not agent invention.
