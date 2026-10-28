# 04 — Creator Editor: complete surface and navigation design

**Owns draft world construction, not remote gameplay.** Every UI element is indexed as a [stable registry item](../../../contracts/ui/v1/INDEX.md). Existing feature specs still own exact map/quest/script domain behavior. UI documents supply navigation, action semantics, visible feedback, and component reuse.

## Editor shell
Top **Project bar**: project name + schema version + dirty/autosave indicator, Save/Save All, Undo/Redo, Validate, Test, Publish (when eligible), View, Search, Help, Account; publish is disabled for invalid changes, with exact Problems panel reference. Sidebar **Asset Explorer**: folders, tags/favorites, search, new/import/duplicate/rename/delete, where-used/dependencies. Central tabbed workspace: map, Blueprint/component, graph/code, quest/dialogue, world systems, commands. Right **Inspector**: typed fields, permission/revision, override origin and reset. Bottom dock: Problems, Test Output, Execution Trace, Server/Build logs and Help. Panels are dockable/collapsible with saved per-user workspace layouts; mobile/tablet use drawers and visible explicit toolbar buttons.

## Complete primary screens and interactions
| Screen | Visible elements and controls | Owning system and negative path |
|---|---|---|
| Project Hub | New/Open/Import/Recent/Clone/Backup/Restore, project health/version, missing-dependency report, Continue editing | ProjectService; corrupt import and unsaved drafts don't silently overwrite |
| Map | Select/Place/Paint/Region/Exit/Track/Erase tool palette, cell canvas, layer/floor dropdown, object/search palette, zoom/pan/grid/snap, mini overview, Inspector, exits/contents/region tree, undo/redo, create/link location | EditorMapService and EditTransaction; no gameplay teleport from map click |
| Blueprint | Asset library, component tree, Add Component, Add Child, field editor, references, default/instance/runtime override tabs, graph & code binding tab, preview/test | AssetSchema & BlueprintService; missing schema/cycle blocks publish |
| Graph | Event/Condition/Action palette, search/add node, typed ports/edges, connect/disconnect, selection/group/frame/comment, auto-layout, breakpoint/trace, snap/grid/fit, run isolated test | Typed Graph compiler; one ThemeManager graph-paper renderer |
| Code | Host-local file tree, tabs, Roslyn diagnostics, search/replace, refs insertion, intellisense, hook picker, SDK docs, build/test, attach binding | Local script project; do not run network player code |
| Quests & Dialogue | Quest tree/stages/objectives, prerequisites, branch graph, dialogue lines/choice options, tags, speaker, phasing, rewards, test actors, progression trace | QuestService and typed graph; no false credited objective |
| World Systems | Regions, weather/spawn/event/schedule definitions, condition builder, priority, world clock preview, event history | WorldSystem editor; events validated against ECS |
| Commands | Template selector, names/aliases, scope, typed args, auth condition rule builder, command/action target, help/usage, test console, collision diagnostics | [Visual command editor](../client-input-v1/06-visual-command-editor.md), one CommandDefinition registry |
| Preview | Start/Stop/Reset isolated host, choose test actor, Play Client, expected/actual effects and world revision, inspect trace | Actual isolated host; no fake success, no live production edits |
| Preferences/Help | Theme selection/import/preview, Editor shortcuts, layout, input/touch, accessibility, docs, keyboard reference, diagnostics | User editor preferences; changes do not affect remote Client |
| Publish | validation summary, diff/list of affected assets, migrations, release hash, backup/rollback, final confirmation | Publisher and Host Operations; stopped game, version-pinned release |

## Tool transitions
- Create map room -> select room -> Inspector typed fields -> Add component/Blueprint -> graph/code binding -> validation -> isolated preview -> publish -> Host (explicit window transition). Every path returns to prior selection and preserves scroll position.
- Selecting a quest NPC in map -> link to Dialogue stage and back (stable asset IDs), same runtime quest data not duplicate editor caches.
- View > Show/Hide Panel, Reset Workspace, Save Layout; no invisible-only panel controls, no conflicting float/resize state.
- Two editors open same project: optimistic revision conflict with inspect/diff/merge, no last-writer-wins surprise. Undo applies draft authoring transactions, never multiplayer committed gameplay.
- Disabled Publish: tooltip names errors and Problems link; disabled Add Exit: tooltip identifies no selected source room; destructive delete shows impact count/affected refs and restore.

## Visible copy and accessibility
Text is localized through semantic label/help keys and action registry. Tooltips always have focus/tap Help equivalent. Each inspector field includes label, units/type, origin/default/revision, validation message and override/reset button when writable. Code editor and freeform descriptions own text focus; global map/graph hotkeys must never fire during composition. Confirmation and async states reflect real owner-service results, and errors preserve user data.

## User demos and phases
S09 implements shell/ThemeManager, map controls and graph-paper. S10 adds reusable field/Blueprint and no-code command UI; S11 scripts/graphs; S12 world-system editors; S12Q quests/dialogues. S13 Host panel remains separate, never embedded into Player Client. See [single tracker](../../SPRINT-TRACKING.md).
