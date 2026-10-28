# Scripting UX & Runtime | Indexed Tabs and Subtabs

**Status:** owner-required two modes, PROPOSED detailed UI design. Open only the requested subtab; Markdown is technical authority.

| Tab | Topic / exact questions | Read |
|---|---|---|
| 1. Script workspace | Creating/writing a Unity-like code script, exact controls, inline help, script attachment and debugging | [01 Code Editor](01-code-editor.md) |
| 2. Visual scripting | Modern node canvas, design language, toolbars, contextual palette, typed ports, grouping and touch controls | [02 Node Graph Editor](02-visual-graph-editor.md) |
| 3. Connect to game | Attach to NPC/entity/quest/exit/world, compile, test, preview, publish and live runtime, versioning | [03 Binding to Runtime](03-authoring-to-live-runtime.md) |
| 4. Consistent UX | UI token design, tooltip policy, popovers, dropdown/forms, validation, accessibility, responsive behavior | [04 Design System + Tooltips](04-ui-components-and-tooltips.md) |
| 5. Acceptance | C# vs custom language ADR, interactive UI, custom exposed graph node and game runtime tests | [05 Verification Matrix](05-scripting-ux-test-matrix.md) |
| 6. Language & engine variables | C# vs DSL syntax; #, @, {}, safe refs, exported fields and persistence | [Language/shortcut spec](../../03-contracts/script-languages-shortcuts-and-symbols.md) |
| 7. Memory & isolation | Native engine/script object lifetimes, handles, cross-world safety, sandbox and IPC | [Memory/interop spec](../../03-contracts/script-memory-ownership-and-safety.md) |

## Technical and research references
- [Scripting runtime/ABI contract](../../03-contracts/scripting-runtime-and-capabilities.md) (single ECS authority, code/graph behavior, security).
- [Generic graph contract](../../03-contracts/scripting-and-graph.md).
- [Quest-specific hook modes](../quests/09-custom-scripts-and-event-hooks.md).
- [C# / custom DSL / runtime research](../../08-research/scripting-engine-research.md) and [Unity/Godot engine comparison](../../08-research/engine-and-scripting-architecture-comparison.md).
- [Open ADRs](../../07-decisions/OPEN_DECISIONS.md).
- [Agent cost rules](../../06-quality/token-and-dispatch-policy.md).

## Hard boundaries
- Code editing interface and visual graph are peers: a creator may call exposed code functions from graphs, or call an approved graph as action (where designed), but they never bypass engine transaction ownership.
- Node graph editor is a view/authoring tool, *not* a separate game engine.
- ECS Blueprint composition view differs from runtime behavior graph, dialogue graph, quest chain graph and world-system graph. Each uses shared graph interaction vocabulary but own validation/semantics.
- Device/browser code editing need not run compiler locally; the host can provide compile/diagnostics/test service.
- C++ headless engine and C# code scripts are strong candidates, **not selected**; do not introduce .NET runtime/package into project without approved ADR and measured integration/security evidence.

## Focused scripting subsystems (separate tabs)
Open only the appropriate indexed subsection: **[Code Scripting](code/INDEX.md)** or **[Visual Scripting](visual/INDEX.md)**. Both share the authoritative ECS runtime, and [this full process diagram](00-end-to-end-lifecycle.md) explains how an authored behavior becomes a running hosted game feature. For `@/#/{}`, state ownership and safe engine pointers, see [references and syntax](06-syntax-variables-and-references.md). Do not load both authoring manuals by default.

## Engineering-level worked example
- [Midnight Express: technical architecture diagrams, C#-style script, C++ ECS executor and runtime failure paths](07-midnight-express-technical-case-study.md). This is deliberately the single detailed case study; do not load it for unrelated UI editing.

## Current v1 scripting contract (read FIRST)
[Single agent-facing v1 index](../../03-contracts/scripting-v1/INDEX.md) is the authoritative technical SDK/hook/reference/wire specification. The detailed editor pages here remain the UX design; illustrative SDK names in older workflow pages do not override source contracts. Host runs only **locally authored published scripts**; connected players send game commands, not scripts.

## Decided visual theme and verified phased delivery
Visual Graph Editor: **dark, subtle continuous graph-paper lines, no dotted grid**; all color, font, spacing, node/port and grid tokens come exclusively from [central, user-customizable ThemeManager](../../03-contracts/editor-theme-manager.md). The [S02 phases](../../05-sprints/specs/S02.md) build it; [S13 phases](../../05-sprints/specs/S13.md) compile C#/Protobuf and implement native hooks/Graph parity; [S17 phases](../../05-sprints/specs/S17.md) verify host restart/recovery. Each phase gets one Builder, independent scoped Auditor and user-testable result before its checkbox is checked.

[**Technical Case Study 02 — Tollbridge Ambush / combat**](08-combat-technical-case-study.md): timed, turn-based and hybrid encounters, NPC aid cry/hearing/fleeing, graph authoring, proposed C# hooks, native commit, sequence diagram and acceptance matrix.

[**Technical Case Study 03 — Traveling Merchant's Chest**](09-inventory-technical-case-study.md): any entity's inventory, nested bags, chest access, stack splitting, equipment and live two-player trade with graphs, C# and transactional acceptance.

[**Technical Case Study 04 — LOOK aboard Midnight Express**](10-look-technical-case-study.md): appearance of rooms, NPCs and exits, virtual details, a window into passing scenery, private phasing, locked-chest contents, C# query, diagrams and real acceptance checks.

[**Technical Case Study 05 — Northgate NPCs**](11-npc-technical-case-study.md): guard/quest giver, wandering merchant, banker/auctioneer, pure custom ECS NPC, scheduled patrols, C# hooks and live acceptance.

[**Creator Tutorial — Craft a Sword with ECS and visual graph**](12-crafting-graph-tutorial.md): 3 Wood + 2 Iron + blacksmithing >= 2, workbench, atomic output-to-inventory, script/graph parity and negative tests.
