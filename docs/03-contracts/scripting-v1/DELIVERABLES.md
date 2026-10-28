# Scripting v1 — Concrete Deliverables and Verification Status

**Created:** 2026-10-28. **Purpose:** a concise inventory for the project owner, Lead, Builder and Auditor. Do **not** treat a source file, unexecuted test, or a design contract as runtime proof. **Product:** each MudMaker user creates/hosts their own worlds and can play worlds hosted by other people. Only a host's **locally authored and published** script DLLs load in that host's worker. Connected players send gameplay commands, never scripts.

## Completed as repository source/documentation

| ID | Deliverable | Exact entry point | Status |
|---|---|---|---|
| D01 | Selected scripting language, worker IPC, binding/security rationale | [Decisions](01-decisions-and-evidence.md) | Specification |
| D02 | C# 14/.NET 10 typed public SDK: events, references, overrides, hook decisions and effects | [Contracts.cs](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs), [SDK project](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/MudMaker.Scripting.Abstractions.csproj) | Source written; **not compiled** |
| D03 | Canonical hook identifiers, event/phase/return types, source-level examples for every hook | [121-hook machine registry](../../../contracts/scripting/v1/hooks.v1.json), [hook-by-hook C# catalog](../../../examples/scripting/hook-catalog/INDEX.md), [human-readable hook contract](03-hook-registry.md) | Registry + examples; **no native dispatch evidence** |
| D04 | Effect-capability matrix and Protobuf v1 messages | [Effects](../../../contracts/scripting/v1/effects.v1.json), [Proto](../../../contracts/scripting/v1/mudmaker_scripting_v1.proto) | Wire/schema source; **not generated/tested** |
| D05 | Real game-specific C# scripts for NPC dialogue, quiz, quest transitions, rewards and storm | [MidnightExpressHooks.cs](../../../examples/scripting/MidnightExpressHooks.cs), [five binding records](../../../examples/scripting/midnight-bindings.json) | Source written; **not engine-integrated** |
| D06 | Persistent engine-property and variable overrides | [State contract](04-references-and-state.md), [PersistentStationOverrides.cs](../../../examples/scripting/PersistentStationOverrides.cs) | API + example; **persistence not implemented** |
| D07 | Other practical hook-family scripts | [Examples index](../../../examples/scripting/hook-families/README.md) | Source examples, not complete game systems |
| D08 | Source-level Evennia counterpart audit, pinned upstream code, per-module navigation | [Evennia index](../../08-research/evennia-hook-parity/INDEX.md), [machine mapping](../../08-research/evennia-hook-parity/evennia-hook-map.v1.json) | **108** distinct upstream methods, **89** MudMaker counterpart IDs; mapping is not runtime parity |
| D09 | Local publisher and worker examples: DLL hash, manifest/bindings, loader, typed wire codec and frame loop | [Publisher](../../../examples/scripting/publisher/Program.cs), [worker entry](../../../examples/scripting/worker/Program.cs), [binder](../../../examples/scripting/worker/InstalledScriptCatalog.cs), [codec](../../../examples/scripting/worker/ScriptWireCodec.cs) | C# source; **not a complete or secured host** |
| D10 | Explicit stop/edit/build/publish/restart lifecycle and player-to-ECS dispatch | [Exact lifecycle](09-build-publish-restart-run.md), [local-host security](08-local-host-integration.md) | Technical contract |
| D11 | Source-level behavior checks and verification plan | [C# assertion project](../../../examples/scripting/tests/MudMaker.ScriptContractChecks.csproj), [assertion source](../../../examples/scripting/tests/Program.cs), [full gates](07-verification-gates.md) | Test source; **not run** |
| D12 | Indexed technical authority suitable for small agent read sets | [Scripting v1 index](INDEX.md), [Code index](../../04-features/scripting/code/INDEX.md), [Visual index](../../04-features/scripting/visual/INDEX.md) | Documentation/index |

## How to use the deliverables without bloating an agent's context

| Agent task | Minimum read set |
|---|---|
| Implement NPC/quest hook | [hook registry](03-hook-registry.md), [SDK](02-code-sdk.md), one [gameplay example](../../../examples/scripting/MidnightExpressHooks.cs) |
| Implement movement/exit hook | [hook registry](03-hook-registry.md), [movement example](../../../examples/scripting/hook-families/MovementAndContainment.cs), relevant spatial contract |
| Implement persistent property override | [references/state](04-references-and-state.md), [SDK types](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs), [override example](../../../examples/scripting/PersistentStationOverrides.cs) |
| Implement worker/supervisor/start | [startup flow](09-build-publish-restart-run.md), [wire security](05-wire-security-recovery.md), worker source and proto |
| Check Evennia coverage | [source mapping](../../08-research/evennia-hook-parity/INDEX.md), **one** corresponding module page, machine registry |
| Audit real runtime behavior | [verification gates](07-verification-gates.md), sprint spec, relevant implementation diff |

## Not delivered or not yet verified

1. **Compilation:** The authoring environment has no installed `dotnet` or `protoc`. No C# compile, protobuf generation or source-assertion run is claimed. Run the exact commands in [startup flow](09-build-publish-restart-run.md). Resolve source errors before marking any sample build-ready.
2. **Compiler/publisher integration:** The local publisher is a reference demonstration. Its comments explicitly state it **does not yet validate** binding permissions, owner assets, capability manifests or full signed release integrity. Do not treat its output as safe to host.
3. **Hosted game server:** The authoritative native C++ world actor, command gateway, persistent transaction/outbox, validated script reply executor, OS-level worker supervision and restart state migration are not implemented by these deliverables.
4. **Hook parity:** **121** precise hook IDs and attributed C# methods are source-defined. This is *not* 121 implemented runtime engine callbacks. Many hook-catalog methods demonstrate safe default behavior or a durable counter, not full feature gameplay. The [family examples](../../../examples/scripting/hook-families/README.md) are the focused real gameplay demonstrations.
5. **Security/runtime performance:** No worker confinement, resource budget, crash recovery, race/transaction correctness, cross-platform hosting or latency measurements have been executed.
6. **Presentation:** Query hooks have read-only result types, but the native client projection, visibility gates and renderer integration remain to be implemented and tested.

## Acceptance evidence required before claiming “real hosted scripting works”

- All three C# projects (SDK, scripts, worker) and the publisher build without errors, and the source assertion project passes.
- Generated Protobuf C# and C++ bindings agree with versioned contract; schema drift test catches changes.
- Local owner can bind, publish, stop/restart and run a script without the server accepting player-sent script bytes.
- Two real clients trigger a host script through authenticated, authorized commands; C++ engine validates effects, persists quest/rewards/overrides and projects correct per-player narration.
- Repeated turn-in/reconnect, worker failure, failed compilation, stale reference, schema migration and crash after commit recover correctly with no duplicate reward/incorrect world state.
- An independent Auditor records explicit pass/fail and evidence. Until then, **SOURCE COMPLETE / RUNTIME UNVERIFIED**.

**PR:** [MudMaker draft architecture PR #6](https://github.com/KevesDev/MudMaker/pull/6). Leave the PR draft until implementation evidence supports the claimed scope.
