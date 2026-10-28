# Visual Graph and C# Script Execution Contract — v1

**DECIDED interface, NOT IMPLEMENTED.** MudMaker provides standard C# 14/.NET 10 host-local scripting and typed visual graph assets. Both produce the same `HookDecision` / `HookQueryResult` and declared `GameEffect` semantics, evaluated by the same native ECS authority. **No C# transpilation, alternate interpreter language or hot reload is required.**

## Exact authoritative references
- [Scripting v1 agent index](scripting-v1/INDEX.md): read only the required subfile.
- [Graph compiler and parity contract](scripting-v1/06-graph-parity-and-publishing.md): typed node/event/value/flow schema, immutable release and mode validation.
- [Exact script/graph APIs](../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs), [hooks registry](../../contracts/scripting/v1/hooks.v1.json), [effect registry](../../contracts/scripting/v1/effects.v1.json).
- [Central ThemeManager + dark graph paper](editor-theme-manager.md): **one** appearance authority. Every Blueprint, visual script, dialogue, quest and world event graph uses the shared renderer, with continuous square lines rather than dots, no local fonts/colors.
- [Graph editor interactions](../04-features/scripting/02-visual-graph-editor.md).
- [S13 phase deliverables](../05-sprints/specs/S17.md) for compiler/runtime validation and [S02](../05-sprints/specs/S03.md) for graph-paper/ThemeManager component.

## Behavior
Editor stores a versioned GraphAsset with node schema, typed ports, stable identifiers, edges, layout and a capability manifest. Compiler rejects unknown node types, incompatible ports, cycles requiring unbounded execution, dangling script functions, forbidden effects or missing releases. Graph execution never mutates ECS directly; it constructs the same typed effect/query result the C# bridge uses.

Custom `[MudGraphCallable]` code functions resolve through the host-published script registry with typed signatures and pinned version; they are not arbitrary reflection calls or scripts from players. A visual graph and C# handler with equivalent inputs must produce identical committed state, projected narration and failure behavior. Persistent property overrides use exactly the same validated ECS state layer.

Host stops → saves/compiles/validates graph/code → publishes → restarts. User's graph canvas and style tokens are preferences, not gameplay state. Tests and no-code proof are phase deliverables; no source-only demos count as full runtime validation.
