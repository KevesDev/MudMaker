# 01 | Code Scripting Editor — Professional Unity-like Workflow

**Status:** C# 14/.NET 10/Roslyn, host-local published scripts and SDK v1 are DECIDED; UI implementation pending. **Owner:** Script Workspace UI / Asset Registry. **Theme:** [central ThemeManager](../../03-contracts/editor-theme-manager.md). Read [scripting UX index](INDEX.md).

## Screen regions
- Top: tabs **World / Blueprint / Script / Graph / Test**, breadcrumb to current asset, version / dirty / compile / publish status.
- Left collapsible rail: scripts tree, search, recent, templates, use-sites and groups **Object, Quest, Dialogue, World, Shared**.
- Center: source editor with line numbers, syntax highlighting, folding, completion, parameter tooltips, find/replace, go-to definition, reference search, diagnostics and breakpoint gutter; optional minimap.
- Right: tabbed inspector **Properties, Attachments, Event Handlers, Permissions, Help** showing typed exposed variables, bound entities, hooks and capability manifest. Compact, collapse on tablets.
- Bottom collapsed by default: **Problems / Test Output / Event Trace / Component Changes / Performance**. A game-state diff, not only console logs.

## Exact interactions
**New Script (+):** choose Object Behavior / Quest Hook / Dialogue / World System / Shared Function, name/path and typed template. Template is editable boilerplate, never counts as implemented behavior. **Event Handler (+):** searchable dropdown for OnInteract, OnEnter, QuestTurnIn, WorldEventStarted and registered custom typed hooks; signature/summary popup. **Attach To…:** search target entity/Blueprint/quest stage/region, select action mode Normal/Before/After/Replace/Both/Conditional, condition and failure policy, then adjust exposed property overrides without duplicating source. **Validate:** compiler diagnostics and policy check, does not publish. **Test ▾:** Run in private test world, Debug, Select actor/quest state; show actual ECS changes, events and client-facing narration. **Expose To Graph:** a typed callable function becomes registered palette node with name, category, inputs/outputs and tooltip. **Publish:** project-level versioned release only after validation; saving source is never automatically a hot update.

## Language intelligence and ergonomic API
Use a Roslyn-backed C# 14 language service for semantic completion, code diagnostics and refactor/navigation, not an assumption that stock Monaco provides C# intelligence. Autocomplete suggests allowed ECS APIs and entity refs; hover **or focus/tap** reveals one-line help, signature and More details. Code snippets for common hooks, but do not hide lifecycle logic in magic generated boilerplate. Editor reference pickers insert valid C# code; no alternate syntax grammar. See [selected language rules](../../03-contracts/script-languages-shortcuts-and-symbols.md).

## Exposed fields and overrides
Script has versioned defaults; an instance can override approved fields using inspector controls: text, integer/decimal, bool, enum, color, array, entity/asset picker, quest/region reference, optional type, range validation, reset-to-default, grouped help. Display inherited vs override values and effective result; persistent state belongs to ECS component/quest/world, not unchecked script static fields.

## Tablet and accessibility
Rail and inspector become drawers; code gets most screen area when virtual keyboard opens. Explicit buttons for handler insertion, API help, file search and attach; hover/right-click only supplementary. Focus-aware centralized Input Manager prevents global shortcuts while typing. Screen reader announces diagnostics and controls. Remote compiler/service executes scripts on host, not iPad.

## Acceptance
Author valid script; error points to real location; attach to NPC and quest; exposed variable changes per instance; callable C# function appears in graph; real script test mutates ECS via approved actions and sends correct observer narration; invalid capability fails; restart uses pinned version; desktop/tablet operations genuinely exercised.

## Required visual and milestone authority
All code editor typography, syntax category tokens, backgrounds, diagnostics, spacing and interaction tokens come from the [central user-customizable ThemeManager](../../03-contracts/editor-theme-manager.md). Never define a local editor palette or hardcoded fonts. See [S09 phases](../../05-sprints/phases/S09.md) for theme/UI deliverables and [S11 phases](../../05-sprints/phases/S11.md) for real Roslyn compile, C# hook binding and error trace. Source-level examples are not proof of a functioning host.
