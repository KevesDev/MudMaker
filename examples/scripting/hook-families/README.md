# MudMaker hook family C# examples

**Source-level C# 14, against SDK v1. NOT a running game.** These are genuine methods with `[MudHook]` attributes and typed event/decision signatures. They become executable only after the native ECS hook dispatcher + local worker have been built, compiled and tested. Each script is authored and published by its game host. Remote players submit gameplay inputs, not scripts.

| Module | Sample responsibilities |
|---|---|
| [MovementAndContainment.cs](MovementAndContainment.cs) | Before move and receive vetoes; observer narration query; deletion invariant |
| [ObjectsAndPresentation.cs](ObjectsAndPresentation.cs) | Quest-conditioned appearance, spawn and rename callbacks |
| [AccountsAndCommands.cs](AccountsAndCommands.cs) | Pre-login maintenance gate, command intercept, command text query |
| [ChannelsAndMessages.cs](ChannelsAndMessages.cs) | Channel moderation, message formatting query, membership validation |
| [SchedulingAndHost.cs](SchedulingAndHost.cs) | Scheduler eligibility, durable tick state, safe host shutdown |
| [InventoryAndWorld.cs](InventoryAndWorld.cs) | Inventory rules and world lifecycle observation |
| [../MidnightExpressHooks.cs](../MidnightExpressHooks.cs) | Bob dialogue, conductor quiz, Joe quest, regional storm, rewards |
| [../PersistentStationOverrides.cs](../PersistentStationOverrides.cs) | Validated persistent door/region state overrides |

**All hook IDs** are declared in [hooks.v1.json](../../../contracts/scripting/v1/hooks.v1.json). [Evennia parity index](../../../docs/08-research/evennia-hook-parity/INDEX.md) identifies the individual source counterpart. Hooks not shown as examples still have exact signature/phase and binding data in the catalog; this is not a claim that each possible hook behavior has been implemented in the engine.
