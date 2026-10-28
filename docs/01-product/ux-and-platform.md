# UX, Accessibility and Device Support

**Status:** REQUIRED cross-platform and visual-first goals; PROPOSED interaction contract. **Owner:** frontend/editor. **Dependencies:** vision, spatial, command contracts.

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
- Mobile browser can edit a hosted workspace without embedding a Java runtime in the tablet. Running a locally hosted server on tablets is OPEN.
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
