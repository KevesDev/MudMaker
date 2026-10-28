# C# 14 Scripting Syntax and Editor Shortcuts — Selected Rules

**Status: DECIDED C# language/SDK contract; tooling not implemented.** MudMaker uses standard C# 14/.NET 10 LTS and the exact [v1 public SDK](../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs). Code scripts are locally authored/published by the game host. This file records *editor-level conveniences* only. See the [canonical SDK reference](scripting-v1/02-code-sdk.md) and [references/state](scripting-v1/04-references-and-state.md) for actual methods.

## Native C# stays unchanged
Source files are ordinary valid C#, compiled by Roslyn; no alternate MudMaker programming language, undisclosed C# preprocessing or magic rewrites. C# `#` retains preprocessor meaning, `@` retains C# identifier/string meaning, `{}` retain blocks and C# interpolation, and `$` remains native interpolated-string syntax. Attribute names, class signatures, hook IDs and effect types must resolve in the versioned SDK; do not copy examples using `[MudBehavior]`, `[MudOn]`, `EffectPlan`, `InteractionContext` or other historical unimplemented symbols.

## Editor conveniences (not a new grammar)
- **Insert Reference** searches stable asset GUIDs, entity/Blueprint bindings, component field schema, quest/world events and state slots; inserts valid typed C# references produced from registered metadata.
- Typing a `.` after an SDK reference provides Roslyn-aware completion/hover/go-to-definition and the declared permission/effect scope.
- The **editor search/picker**, distinct from raw source, can accept `@` to search named entities and `#` to filter asset/event categories. These are *UI search operations*, not a transformation of code. Search fields also have visible buttons and accessible menus; keyboard shortcuts are optional.
- Dialogue/message templates may use escaped, allowlisted typed `{actor.displayName}`-style fields in a **separate data/template interpreter**. They are not evaluated as arbitrary C# code and cannot expose unpermitted data.
- Generated fields in the editor insert stable typed `EntityRef`, `AssetRef`, `FieldRef`, `StateSlotRef` or scoped read/effect calls from [SDK declarations](scripting-v1/02-code-sdk.md). No direct pointers or string-based access to arbitrary memory.

## Exact handler model
```csharp
[MudScript("my-game.station")]
public sealed class StationHooks
{
    [MudHook("npc.interact.before")]
    public HookDecision OnStationNpc(HookContext ctx, NpcInteractEvent e)
        => HookDecision.Continue();
}
```
Imports: `using MudMaker.Scripting.V1;`. Return `HookDecision` for Before/After, and `HookQueryResult` for the canonical read-only Query hooks. Hook IDs and event CLR types come **only** from [hooks.v1.json](../../contracts/scripting/v1/hooks.v1.json) (see relative link from repo root below); current examples use [real source files](../../examples/scripting/hook-catalog/INDEX.md) as the task-relevant authority. The exact package paths are `contracts/scripting/v1/` and `examples/scripting/` from repository root.

## Persistent variables
Function locals last one invocation. C# worker object fields or statics are **not** authoritative persistent storage. Persistent game state is registered ECS component fields and versioned state slots with permitted scopes (entity/player/quest attempt/region/world). Scripts may override declared writable engine fields using typed `SetComponentField`, `AdjustComponentNumber`, `ClearComponentOverride`, `WriteStateSlot` and `DeleteStateSlot` effects. The engine validates and logs and restores state after restart; see [04](scripting-v1/04-references-and-state.md).

## Design/runtime rule
Host stops running game → local edit/validate/compile → publish immutable release → start game → server loads only host-authored DLL/graph assets. No hot reload required. Player clients submit authenticated gameplay commands **never script source/assemblies**. See [publish/run](scripting-v1/09-build-publish-restart-run.md).

**Implementation status:** source contracts exist; real C# + Protobuf compilation, native dispatch and restart tests are planned in [S11 phases](../05-sprints/specs/S11.md) and [S13 phases](../05-sprints/specs/S13.md). Do not mark runnable before tests.
