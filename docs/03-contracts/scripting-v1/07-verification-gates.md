# 07 | Scripting v1 Verification and Negative Tests

**Status:** TEST CONTRACT, not evidence that tests have run. Only call v1 implemented/verified once real source compiles and integrated world works.

## Contract static validation
1. Build C# SDK `Contracts.cs` against pinned .NET 10/C# 14 SDK; compile the exact MidnightExpress example. No fake SDK methods or invented runtime claims.
2. Run `protoc` over normative `mudmaker_scripting_v1.proto` and generate C++/C# serializers. Verify every public event/effect has a wire variant, round-trip compatibility, stable field numbers and enum zero rejection.
3. Validate all example `[MudHook]` IDs, event types and method signatures against [canonical registry](03-hook-registry.md). Unknown, mismatched, duplicate incompatible, wrong phase/mode and wrong-owner bindings fail publish.
4. Validate C# SDK type and Graph node registry match actual bound field-schema values; signature changes invalidate dependent graph in controlled migration.

## End-to-end hosted game
5. Host locally (GUI and Linux headless) with only **owner-created, locally published scripts**; connect two real remote players. Ensure no incoming command/transport schema can transfer script, DLL or raw executable material, and game-server never compiles code supplied in game commands.
6. Bob/Conductor/Joe train + two-player oracle: moving interior containment, answer checked server-side, Joe phase/target visibility, storm start/stop, correct quest and reward ledger, observer narration by location.
7. Persistent overrides: set lamp intensity and door state using typed component-field API; verify effective value, indexes, replication, restart, clear override, Blueprint migration and world-instance isolation. Verify slot scopes (world, player, quest attempt, region, entity).
8. Crash after state commit before narration delivery: replay outbox/onceKeys; no repeated reward/bonus roll or lost world-event stop intent.
9. Worker crashes/hangs or returns malformed/forged effects: C++ engine refuses unauthorized effect, produces actionable trace, host recovers service, no partial quest or state mutation.
10. Fuzz invalid refs/generation, protocol version, field type/range, stale expectedVersion, missing field migrations, duplicate onceKey, effect count/memory/CPU ceiling. Host diagnostics redact private payloads.
11. Graph/code parity: execute equivalent authoring using both paths, compare ECS state/event outbox and player-visible authorized projection. No graph-only shortcut.

## Evidence policy
Report exact command, compiler/proto versions, real host OS, test case, expected/actual, transaction+event IDs (redacted), pass/fail and benchmark p50/p95/p99. **No measurements or passing tests have been claimed for this specification work.** Preserve v1 decisions unless real benchmark or correctness tests demonstrate needed change, then ADR version and migration.

## Source-level executable checks: real C# projects
Run `dotnet build examples/scripting/MudMaker.ScriptExamples.csproj -c Release`, `dotnet build examples/scripting/worker/MudMaker.ScriptWorker.csproj -c Release`, `dotnet build examples/scripting/publisher/MudMaker.LocalPublisher.csproj -c Release`, and `dotnet run --project examples/scripting/tests/MudMaker.ScriptContractChecks.csproj`. The tests exercise real authored C# methods, not mocks of a C++ game. The SDK and examples remain **uncompiled in this authoring environment** (dotnet/protoc not installed), so do not claim PASS. `Grpc.Tools` and `Google.Protobuf` package versions are pinned in worker csproj. A failure requires Builder correction before declaring runnable.
  
The [host lifecycle](09-build-publish-restart-run.md) is STOP → local edit/build/test → publish complete immutable release → START. No in-game script upload, hot reload or script recompilation on player connection.
