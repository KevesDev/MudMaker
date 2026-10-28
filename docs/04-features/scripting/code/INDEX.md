# Code Scripting | Tabs / Subtabs

**Status:** Required creator capability; PROPOSED detailed UX and code API. **Read budget:** open ONE subtab + relevant runtime contract, not entire scripting folder.

| Tab | Subtab | Read |
|---|---|---|
| Code A | Script workspace, toolbar, script templates, source editing, diagnostics and tooltips | [Editor UX](../01-code-editor.md) |
| Code B | C# candidate, Unity/Godot comparison, native worker decisions | [Language research](../../../08-research/native-engine-and-scripting-options.md) |
| Code C | Variables, engine references, @/#/{} shortcuts and insert pickers | [Syntax/variables](../06-syntax-variables-and-references.md) |
| Code D | Type contracts, entity handles, script state, sandbox, hooks and approved ECS calls | [Language contract](../../../03-contracts/scripting-language-and-references.md) |
| Code E | Attach to NPC/quest/system, test, publish, run and live-debug | [Live bindings](../03-authoring-to-live-runtime.md) |
| Code F | Full creation-to-hosting process | [Lifecycle diagrams](../00-end-to-end-lifecycle.md) |
| Code G | Script-specific acceptance and safety | [Test matrix](../05-scripting-ux-test-matrix.md) |

**Engine rule:** C# is a candidate, not locked. On host a code module executes through a sandboxed approved Script Host with typed SDK and effect plans. Runtime engine authorizes mutations. Neither C# syntax nor a custom language may expose native ECS pointers or unapproved memory.

**Do not confuse:** C# attribute, `@` identifier or `#` directive with an invented MudMaker macro. UI reference pickers provide typed insertion without changing C# grammar.

**Companion:** [Visual Scripting](../visual/INDEX.md) for graphs and [Quest Hooks](../../quests/09-custom-scripts-and-event-hooks.md) for custom stage bindings.
