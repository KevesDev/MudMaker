# 09 — Real C# → Published Module → Restarted Hosted Game

**DECIDED PRODUCT FLOW:** game owner **stops** the hosted world, edits only their local C# / graph assets, validates them, compiles the source, publishes a new immutable release, then **starts** the world again. **No hot reload or live script replacement is required.** Player clients never send code or select handler IDs. This is a precise implementation sequence, not a claim that the C++ engine/server is complete.

## What the engine actually "reads"

1. **Roslyn / dotnet compiler reads host-authored `.cs`** and references the C# 14/.NET 10 [MudMaker SDK v1 assembly](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs). Type-checks handler signatures. Script DLL is emitted. The **native ECS does not parse C#**.
2. **Local publisher** verifies the owner's project assets, binding owners, hook IDs, event/return CLR types, cap manifest, field schemas and dependency versions. It installs the compiled DLL into a newly numbered immutable release directory with the exact binding table and SHA-256 digest. **Reference publisher source**: [Program.cs](../../../examples/scripting/publisher/Program.cs). The current publisher is a **source demonstration of copy/hash/manifest only**; it does **not** implement the full asset/capability validation or transactional publication, and must not be used to host unvalidated content.
3. **Host supervisor** checks prior server stopped, reads selected release manifest, validates compatible ECS/ABI/persistence schemas, restores world snapshot + journal/override slots, spawns the protected **local C# worker**. No incoming player connection is accepted before readiness.
4. **Worker** verifies DLL SHA-256, loads the locally published assembly using .NET assembly loading, reflects `[MudScript]` and `[MudHook]` declarations into a bindingId→method lookup. [InstalledScriptCatalog.cs](../../../examples/scripting/worker/InstalledScriptCatalog.cs); [Program.cs](../../../examples/scripting/worker/Program.cs). **Reflection is for host-installed DLL binding**, not a player feature. Process OS privileges, CPU/memory quotas and execution timeouts are enforced by supervisor, not by an attribute.
5. Supervisor and worker exchange versioned `ProtocolHello` → `WorkerReady` on a protected local pipe with framed [Protobuf](../../../contracts/scripting/v1/mudmaker_scripting_v1.proto) messages. Supervisor verifies SDK hash, release hash, expected hook count, ABI major and worker process ownership. Current **reference Worker** implements handshake using release hash and major protocol; SDK hash/process ownership/supervisor liveness are implementation gaps.
6. Authenticated **remote players send gameplay requests**, e.g. `Interact(JoeRef)` or `QuestTurnIn(questAttempt)`. The **native command gateway** validates actor/session/permissions, targetability, quest eligibility and location, selects a published `HookBinding`, and creates immutable filtered `HookInvoke`. Neither script names nor assembly locations come from the client.
7. Worker converts wire values into `HookContext` + typed `MudEvent` ([ScriptWireCodec.cs](../../../examples/scripting/worker/ScriptWireCodec.cs)), invokes the exact C# handler with `HookDecision` / `HookQueryResult`, converts allowed result to `HookReply`. The worker **does not own authoritative state** and never calls into C++ memory.
8. **C++ world actor** checks the reply against manifest capabilities and current world revision, resolves every entity generation/field schema, tests all default and creator effects, applies one ordered atomic transaction including persistent overrides, quest/rewards/event intents, idempotency and an outbox. If any step fails: no partial commit, safe player error and detailed host diagnostics.
9. **Observer projection** consumes committed domain events to send appropriately scoped narration and changed visible state to connected MudMaker clients. A crash/retry uses persisted onceKeys/event IDs; no second reward or duplicated successful state transition.
10. To update: disconnect/stop players gracefully, flush and persist world, stop worker, validate/build next version offline, publish; new host start pins new release. Failed validation/startup leaves prior published release available for rollback. Mutable world state requires explicit schema migration when asset definitions change.

## Reproducible source-level commands (repository root)

```bash
# Prerequisite: installed .NET 10 SDK, NuGet restore enabled for worker.
dotnet build contracts/scripting/v1/MudMaker.Scripting.Abstractions/MudMaker.Scripting.Abstractions.csproj -c Release
dotnet build examples/scripting/MudMaker.ScriptExamples.csproj -c Release
dotnet build examples/scripting/worker/MudMaker.ScriptWorker.csproj -c Release
dotnet build examples/scripting/publisher/MudMaker.LocalPublisher.csproj -c Release

# Owner has prepared published binding metadata (sample: Midnight Express).
# This is ONLY a publisher artifact demonstration; it is NOT full world publishing.
# Use fresh destination, not the running world's mutable directory.
dotnet run --project examples/scripting/publisher/MudMaker.LocalPublisher.csproj -- \
  examples/scripting/bin/Release/net10.0/MudMaker.ScriptExamples.dll \
  examples/scripting/midnight-bindings.json \
  0000000000000000000000000000000000000000000000000000000000000001 \
  ./local-releases/demo-0001

# A completed native server/supervisor will launch:
# dotnet examples/scripting/worker/bin/Release/net10.0/MudMaker.ScriptWorker.dll \
#   ./local-releases/demo-0001 ./local-releases/demo-0001/module-manifest.json
# Do NOT launch this manually for a live world: worker expects protected binary
# Protobuf Hello/Invoke frames on stdin; an operator terminal supplies none.
```

**Exactly what is executable in this repository today:** SDK C# project, script examples, Protobuf worker/reference codec, local DLL publisher source. They are C# **source**, not pseudocode, but compilation has **not been run** in this authoring environment (dotnet and protoc absent). The C++ world actor, secured supervisor, persistent transaction implementation, real player command gateway, full release validator and end-to-end hosted gameplay do not exist in these changes. The example cannot yet host a game. Treat that as a real implementation prerequisite, never a pass.

## Concrete callback: local owner code

```csharp
[MudHook("quest.turn_in.before")]
public HookDecision JoeTurnIn(HookContext ctx, QuestTurnInEvent e)
{
    var attempt = ctx.Actor.Quest(FindJoe);
    if (attempt is null || !attempt.ReadyToTurnIn || attempt.AttemptId != e.AttemptId)
        return HookDecision.Veto("QUEST_NOT_READY");

    var effects = new List<GameEffect> {
        new CompleteQuest(attempt.AttemptId, e.EventId, Once(ctx, "complete")),
        new ChangeWorldEvent(Storm, HarborRegion, WorldEventAction.Stop, Once(ctx, "storm")),
        new GrantRewardPlan(ctx.Actor.Ref, RailPass, attempt.AttemptId, Once(ctx, "pass"))
    };
    if (ctx.Actor.NameKey.StartsWith("a", StringComparison.Ordinal))
        effects.Add(new RollRewardTable(ctx.Actor.Ref, BonusTable, attempt.AttemptId,
                                        Once(ctx, "bonus")));
    return HookDecision.Replace(effects.ToArray());
}
```

Full compilable-shape class: [MidnightExpressHooks.cs](../../../examples/scripting/MidnightExpressHooks.cs). The script does **not** persist reward entries itself. Native engine turns `GameEffect`s into a validated atomic transaction. `Once(ctx, action)` deterministically scopes the intent to the authenticated request; final **per-quest-attempt** deduplication remains in authoritative reward ledger.

## Why the code is structured this way
`HookContext` supplies filtered typed snapshots so native world state stays consistent; `HookDecision` describes effects, avoiding raw pointers; server-side onceKeys/transaction ledger prevent retries from granting duplicate rewards; a separate worker prevents a crashed script from directly crashing the ECS process; hot code edits cannot change a currently running release.

## Hard failures requiring supervisor implementation
Worker hang/memory overflow, invalid field version, script reference outside the world, broken manifest DLL signature, missing bound hook, bad OS sandbox profile, incompatible migrated slot state, repeated pending invocation, failed persistence commit, or outbox replay failure must each produce a structured trace and **no false "game started" / success report**. World start gate must test one concrete bound script via worker handshake + smoke command before exposing public player port.
