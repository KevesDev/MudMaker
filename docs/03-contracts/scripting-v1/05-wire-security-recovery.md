# 05 | Local Host Scripts, Worker IPC, Validation, Logging and Recovery

**Product trust model (REQUIRED):** Each MudMaker owner creates/edits their **own local game**, publishes its scripts locally, then hosts the game using the GUI or headless server. They can also join and play games hosted by others. A game server loads **only the host's locally authored, published script modules** for that world. **Connected players never upload, send, evaluate, or install script source, bytecode, plugins, scripts or executable payloads.** Server command payloads are authenticated typed player actions and dialogue choices only. No remote script compilation endpoint or auto-import of player files. The owner may intentionally modify scripts in their editor and republish; this is a separate local owner action, not a player command.

**Status:** v1 API/wire contract DECIDED; runtime process isolation and crash testing are NOT VERIFIED.

## Host pipeline and security
Local creator editor saves draft `ScriptAsset` / `GraphAsset` → local compiler/validator → pinned immutable release (module checksums, manifest, bindings, world assets) → host supervisor launches native ECS server + separate .NET 10 script worker → external player authenticates to server → authoritative command dispatcher chooses a **host-installed** hook → worker returns bounded typed `HookReply` → engine commits validated effects. Only the game host controls installed script source and publish rights.

- Independent worker chosen for fault containment, bounded memory/time and prevent accidental corruption/crash of native game world. This is not because players supply untrusted scripts. The worker is restricted from arbitrary host DB/ECS memory/credentials and direct network broadcasts; use typed engine capabilities.
- Script-worker IPC is **local to the host machine**, access-controlled to the supervisor and paired process. No publicly routable script port and no code-evaluation RPC. Wire source [Protobuf v1](../../../contracts/scripting/v1/mudmaker_scripting_v1.proto).
- Compiler uses standard C# 14, pinned .NET 10 and Roslyn with approved dependency manifest; errors include file/line. Denied APIs are diagnosed early; those checks **do not** replace process resource limits.
- Script functions are allowed to change approved in-engine state, including persistent overrides. `SetComponentField`/`WriteStateSlot` effects use registered field/slot metadata, not raw pointers/SQL.
- The server validates even its own script worker's returned effect plan: a buggy local script cannot corrupt quest/reward ledgers or escape its world instance through malformed refs.

## Exact message flow
1. Server authenticates player's game command, validates actor ownership, phase/target/room/access, request idempotency, and selects a binding from the locally published release.
2. World actor creates `HookInvoke`: protocol version; invocation/request IDs; release hash, binding+handler ID; world+entity refs/generations; event type; filtered actor/world/component/slot snapshot + versions; capability set; monotonic deadline + trace.
3. Worker checks version+release/module, dispatches exact method `HookDecision Method(HookContext,TEvent)` from host-authored C# module, returns `HookReply` with known action tag(s). Worker cannot directly modify authoritative ECS state.
4. World actor verifies wire schema, release/binding, permissions, read-set freshness, field/slot definitions, game invariants, mode and effect onceKeys. During worker call world writer is **not blocked**.
5. The complete **before** effect/default command commits or fails atomically (state, overrides, quests, rewards, durable world-event intent, idempotency, outbox). **After** hooks receive committed facts and may queue separately validated durable actions.
6. Narration/interest/phase filters project **committed** facts to the right connected players; player input cannot forge server event facts.

## Errors, budgets and recovery
Constrain max invocation duration, CPU, memory, recursion/effect counts, IPC payload and script logs. On worker timeout/crash, terminate/restart worker, fail the pending before-hook action with a structured error; don't claim it succeeded. Preserve last good published release on invalid update. On engine restart restore recorded world epoch, persistent overrides/variables, pending scheduler/world intents, idempotency and outbox; dedupe retry notifications. Audit logs key on worldId/releaseId/hookId/bindingId/requestId/invocationId/entity version/effect result and safe error code. Bounded redacted diagnostics, rate limits, meaningful host dashboard; never print credentials or raw player-supplied control sequences.

The OS isolation profile is validated per target (Windows/Linux). **Do not claim host safety, sandbox security, exact-once client delivery or availability from a design diagram.** Execute malicious-input, crash/recovery and performance tests before a production claim.

## Evidence (primary docs)
- .NET `AssemblyLoadContext` does not grant process isolation: https://learn.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext
- .NET 10 LTS lifecycle: https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-and-net-core
- Protocol Buffer field-number evolution: https://protobuf.dev/programming-guides/editions/
