# Code Scripting | Tabs / Subtabs

**Status:** C# 14 / .NET 10 and local-host script SDK v1 **DECIDED**; editor UX proposals remain. Current API: [v1 index](../../../03-contracts/scripting-v1/INDEX.md). **Read budget:** open ONE subtab + relevant runtime contract, not entire scripting folder.

| Tab | Subtab | Read |
|---|---|---|
| Code A | Script workspace, toolbar, script templates, source editing, diagnostics and tooltips | [Editor UX](../01-code-editor.md) |
| Code B | Exact SDK class, handler arguments and attributes | [v1 C# SDK](../../../03-contracts/scripting-v1/02-code-sdk.md) |
| Code C | Engine fields, asset/entity references, persistent state, editor reference pickers | [v1 References](../../../03-contracts/scripting-v1/04-references-and-state.md) |
| Code D | Exact hook IDs, event payloads and dispatch rules | [v1 Hook Registry](../../../03-contracts/scripting-v1/03-hook-registry.md) |
| Code E | Attach to NPC/quest/system, test, publish, run and live-debug | [Live bindings](../03-authoring-to-live-runtime.md) |
| Code F | Full creation-to-hosting process | [Lifecycle diagrams](../00-end-to-end-lifecycle.md) |
| Code G | Script-specific acceptance and safety | [Test matrix](../05-scripting-ux-test-matrix.md) |

**Engine rule:** v1 uses standard C# 14, .NET 10 and host-local C# modules launched in a separate bounded worker. Only game owners author/publish scripts locally. Players send game input, not executable scripts. Code may override registered writable engine fields and persistent variables using validated native effects.

**Do not confuse:** C# attribute, `@` identifier or `#` directive with an invented MudMaker macro. UI reference pickers provide typed insertion without changing C# grammar.

**Companion:** [Visual Scripting](../visual/INDEX.md) for graphs and [Quest Hooks](../../quests/09-custom-scripts-and-event-hooks.md) for custom stage bindings.

## Complete code execution example
- [Midnight Express: four proposed C# hook handlers, worker invocation, effect plan, C++ transaction and hosted game](../07-midnight-express-technical-case-study.md). Read only when implementing/refining this vertical slice; it is pseudocode, not shipped APIs.
