# C# Script Language, References and Persistence — v1

**Status: DECIDED specification; no native engine integration yet.** MudMaker uses C# 14 on .NET 10 LTS, compiled with Roslyn. The language, hooks, references, wire protocol, persistence and local-owner publishing are defined in the [current scripting v1 index](scripting-v1/INDEX.md). This page summarizes creator workflows; do not treat it as a second SDK.

## Creator code API
- A `[MudScript]` class declares public methods with `[MudHook]` attributes. Exact event type and return shape are selected from [registered hooks](scripting-v1/03-hook-registry.md) and [machine catalog](../../contracts/scripting/v1/hooks.v1.json).
- **Action hooks:** `public HookDecision Name(HookContext ctx, TEvent e)` where `TEvent` is the registered event. Before handlers can Continue/Append/Replace/Veto/Defer under the hook's permitted policy; After handlers may queue an additional durable operation. **Query hooks:** `public HookQueryResult Name(HookContext ctx, TEvent e)`; never emit effects or grant permissions unavailable in the native engine.
- Code receives immutable authorized `HookContext`, `ActorSnapshot`, `WorldReadSnapshot`, `FieldReadSet`, `StateReadSet` and typed event payload. World refs include generation/world identity; assets and fields are schema-versioned.
- Scripts return typed `GameEffect` intent. The native ECS gateway revalidates world scope, capabilities, versions, rule invariants, onceKeys and actor/observer permissions, then commits atomically with durable outbox. Worker is not the world writer.

## Engine field overrides and scoping
Creators can override registered, script-writable engine components and scoped variables. Every writable schema field has stable identity, type/range/validation, permission, read version, persistence policy and migration behavior. `SetComponentField`, `AdjustComponentNumber`, `ClearComponentOverride`, `WriteStateSlot`, `DeleteStateSlot` are first-class effects. Read via authorized snapshots, write via validated effects. Blueprint defaults → instance authoring overrides → committed runtime overrides, with clear/reset rules. See [state contract](scripting-v1/04-references-and-state.md).

Local C# fields are temporary implementation details; **no implicit saved static state**. Player/account secrets or correct quiz answers are never passed to scripts or other players unless a specific authorized domain protocol requires them. Ref pickers insert generated, stable, typed references; display names are for UX, not identity.

## Editor language behavior
Native C# punctuation is never rewritten. Use Roslyn diagnostics/autocomplete and optional search-field `@` and `#` pickers as editor conveniences only, never as a new grammar. Typed template variables in dialogue and narration use escaped data, not execution. [Syntax contract](script-languages-shortcuts-and-symbols.md) has the exact decision.

## Local host lifecycle
A game creator edits their **local** script assets while the host is stopped, compiles, publishes an immutable release and restarts their hosted world. The isolated C# worker loads only that published module. Remote players send authenticated gameplay commands, never scripts or code. [Concrete compile/publish/restart flow](scripting-v1/09-build-publish-restart-run.md) and [worker IPC](scripting-v1/05-wire-security-recovery.md) are authoritative.

## Verification
All source and protocol projects must pass real toolchain compilation and integration before called functional; exact [S11 phases](../05-sprints/specs/S11.md) and [S13 phases](../05-sprints/specs/S13.md). Do not infer behavior from C# examples alone.
