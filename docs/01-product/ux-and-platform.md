# UX, Accessibility and Device Support

**Status:** REQUIRED cross-platform and visual-first goals; binding interaction contract. **Owner:** frontend/editor. **Dependencies:** vision, spatial, command contracts.

## Main experiences
1. **Project hub:** create/import/open/duplicate/backup project; recognize project schema version, health, and engine compatibility; offer safe recovery.
2. **World editor:** cell map canvas with layer/region selectors, palette, inspector, tool state, undo/redo, search and validation notices.
3. **Blueprint editor:** node/graph view, component inspector, typed connection ports, reusable templates, error diagnostics, preview/test.
4. **Logic editor:** visually author events, conditions, actions and scheduled world-system rules; inspect execution trace.
5. **Play-test:** launch isolated test world, enter as creator/test player, view terminal/map/inspector, stop/restart with controlled state reset.
6. **Host/admin:** deploy or start configured world, show connection instructions, status, logs, connected sessions, backups, rollback and permission management.
7. **Player client:** text terminal, history, autocomplete/help as supported by game schema, sidepanels driven by server events.

## Map workflow
Selecting a cell opens a contextual side panel without losing map position. Show: room name and description, region and tags, contained entities (grouped NPC/items/triggers/scripts), outgoing exits and each exit's destination/name/description/locks/conditions, and a searchable asset palette with categories. Selecting content opens its instance inspector. Changes must show save/validation status. Clicking a blank cell can offer create room; icon and color are visual metadata, not automatically gameplay rules unless explicitly bound.

## Touch/tablet requirements
- Pointer and touch share semantic actions, but touch does not depend on hover, right-click or keyboard shortcuts.
- Tap selects; explicit toolbar/overflow actions support add/remove/configure; long-press is an optional shortcut, never the only path.
- Pan/zoom by touch gestures with safe separation from editing; moving cells or nodes requires clear drag handles/mode so scroll gestures do not corrupt worlds.
- Large enough interactive targets, responsive split view/panel drawer, no permanently offscreen inspector. Keyboard/pencil input may improve UX but must not be required.
- Mobile browser can edit a hosted workspace without embedding a Java runtime in the tablet. Tablets use the supported remote Creator/Player interface; local headless hosting is desktop/server-only for v1. Tablet users can still connect to and manage an authorized remote host.
- Keyboard shortcuts are routed by centralized Input Manager with focus awareness: typing in descriptions/script editor never triggers map/game commands.

## Essential safeguards
- Undo/redo is defined for authoring transactions, including changes spanning cell+exit+entity; never blindly undo live multiplayer gameplay.
- Deleting referenced rooms, exits, blueprints or systems triggers impact analysis, confirmation and transaction validation; no silent dangling references.
- Async saves display pending, success and failure; failed writes do not falsely show saved.
- Project edit vs live-hosted edit modes are visually distinct; publishing uses an explicit controlled deployment flow.
- Accessibility: semantic labels; keyboard alternative to pointer operations; screen-reader descriptions for visual cells/nodes; contrast not dependent on color; respects zoom/reduced-motion. Actual WCAG target is OPEN.
- Errors identify subject, cause, suggested correction, with inspectable technical details for advanced users.

## Verification
Tablet-width tests for map cell select/palette/exit editing, pinch-pan, drag cancellation; desktop keyboard tests for focus isolation; assistive-tech review; autosave/undo conflicts; large-world map navigation performance with measured thresholds (OPEN target).

## Selected end-to-end UI/UX ownership (2026-10-28)
**Canonical UI system:** [UX agent index](../03-contracts/ui-ux/INDEX.md), [machine catalog of every planned visible element](../../contracts/ui/v1/INDEX.md). **Editor** builds worlds, Blueprints, scripts, quests, commands and maps. **Player Client** independently connects to both MudMaker servers and external MUDs; uses transcript, saved profiles, aliases/triggers/timers/hotkeys and a personal evidence-qualified mini mapper. **Host Operations** separately controls server launch, security, logs and backup. Home chooses workspace. Shared widget/theme/focus library does not import project, host, native ECS or network state; independent `EditorIntentRouter`, `ClientIntentRouter`, `HostAdminIntentRouter` enforce ownership.

**One ThemeManager**, distinct Editor and Client resolved preference scopes, with user-customizable fonts/colors and validated import/export; Editor dark continuous graph paper, Client local terminal font/ANSI policy and personal mini mapper. User-generated status text cannot install scripts or create host controls. The player mini mapper is *not* the editor world map. All visible text, field, tooltip, panel and action variants are registered by stable UI ID and test ID with ownership; new UI cannot silently bypass registry.

**S02** common UI and Editor foundation; **S08** independent Player Client and legacy server adapters; **S09–S16** editor features; **S17** host tools; **S18** actual UX/security/device verification. [Tracker](../SPRINT-TRACKING.md). All are designed, not implemented.
