# 04 | References, Engine Field Overrides and Persistent State

**DECIDED v1 contract; implementation NOT VERIFIED.** Engine state overrides are a **first-class creator feature**. Scripts authored locally by the world host can modify script-writable ECS component fields and persistent custom variables through typed effects. The authoritative engine enforces identity, field schema, world isolation, authorization, invariants, persistence and diagnostics. No raw ECS pointer or script database access.

## Canonical public types
[Contracts.cs](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs) owns `EntityRef`, `AssetRef`, `FieldRef`, `StateSlotRef`, `PropertyValue`, `ComponentFieldSnapshot` and `StateSlotSnapshot`. [Wire protobuf](../../../contracts/scripting/v1/mudmaker_scripting_v1.proto) owns serialization. The C# snapshot is a read-only DTO of only fields permitted by the host-authored binding and ECS system. Scripts may not enumerate arbitrary users/entities; current actor/target and bound references are pre-resolved by engine.

| Effect | Allowed mutation |
|---|---|
| `SetComponentField(EntityRef,FieldRef,PropertyValue,ExpectedVersion,Key)` | Replace an exposed writable runtime field |
| `AdjustComponentNumber(EntityRef,FieldRef,Delta,ExpectedVersion,Key)` | Engine-side atomic numerical change with range/domain validation |
| `ClearComponentOverride(EntityRef,FieldRef,ExpectedVersion,Key)` | Revert a runtime override to instance value |
| `WriteStateSlot(StateSlotRef,PropertyValue,ExpectedVersion,Key)` | Write typed persistent or transient creator-owned value |
| `DeleteStateSlot(StateSlotRef,ExpectedVersion,Key)` | Delete script-state value with schema default/reset policy |
| `CreditObjective`, `GrantRewardPlan`, `ChangeWorldEvent`, ... | System-owned transitions, **not** generic writable fields |

All write effects are part of the same `HookDecision` batch with default command when invoked in a before hook. Other changes are observed via new committed domain events, not direct script events.

## Field and slot registration
A host's world schema registers stable: field ID + component type ID + schema revision, value tag, nullable/default, min/max or enum, writable/readable scopes, persistence flag, replication policy, version counter, mutation-validator/system owner and migration rule. Permission to edit a Blueprint in the editor does **not** imply a remotely connected player can change it; scripts belong to the local host's published release.

`StateScope` = World / Region / Entity / Player / QuestAttempt. Every slot has declared scope owner, schema key, value type, persistence (Persistent or Transient), reset/migration policy and writer capability. Script globals/statics aren't durable state.

**Override precedence:** 1) Blueprint default; 2) placed-instance authoring override; 3) committed runtime override (persistent unless field declares transient). `ClearComponentOverride` removes layer 3, not layers 1/2. A Blueprint update preserves compatible overrides; incompatible revisions require migration or safe publication failure, never silent loss.

## Read and write API
`HookContext.Fields` and `HookContext.StateSlots` hold immutable, capability-filtered snapshots and per-key **current versions**. A developer can read the current amount and submit an absolute value with expectedVersion or submit an atomic `AdjustComponentNumber` delta. The engine **rechecks** versions and domain invariants upon commit. The editor and code SDK use strongly typed field bindings generated from the project's exposed schemas; production scripts should not manually guess UUIDs.

```csharp
// v1 API shape, dependent on editor-generated references:
var lamp = ctx.Fields.Require(lampRef, ProjectFields.LampIntensity);
return HookDecision.Append(
    new SetComponentField(lampRef, ProjectFields.LampIntensity,
        PropertyValue.FromDouble(0.15), lamp.Version,
        $"{ctx.RequestId:N}:dim-lamp"));
```

A component field may be writable only via registered owner-system mutation handlers: door locked state must revalidate door/navigation constraints, light intensity must invalidate render/replication, health must honor combat validation. Sensitive/derived data (authentication, entity identity/generation, inventory ledger, quest credit, reward ledger, permissions, world clock) requires explicit domain commands. This is an engine-integrity rule, **not** an arbitrary restriction on creators' capabilities.

## Commit / error / recovery requirements
Native commit must: validate actor/binding capability and host release; resolve entity generation/field revision; validate value tag/range/read version/domain invariant; stage full batch; atomically persist component changes+override provenance+state slots+outbox+onceKeys; then publish one ECS world epoch. Restart hydrates these before admitting players. A conflict returns `MM-SCRIPT-STATE-CONFLICT`; invalid value `MM-SCRIPT-VALUE-INVALID`; write denied `MM-SCRIPT-WRITE-DENIED`; bad generation `MM-SCRIPT-REF-EXPIRED`; migration fail `MM-SCRIPT-MIGRATION-FAILED`. No success narration for rolled-back changes.

Logs include timestamp, world/release/hook/binding/request/invocation IDs, actor and target, field/slot/schema IDs, transaction/effect IDs, safe old/new value summaries (redacted), error code and causal stack. Logs are bounded, rate-limited and operator-readable; player-facing messages reveal no hidden identifiers or secrets.
