# 02 — Canonical Creator Code SDK v1

**Implementation source of truth:** [Contracts.cs](../../../contracts/scripting/v1/MudMaker.Scripting.Abstractions/Contracts.cs); worked use [MidnightExpressHooks.cs](../../../examples/scripting/MidnightExpressHooks.cs). **Status:** decided public interface, source-level declarations written; runtime/worker/compiler not implemented. SDK ABI version = `MudMaker.Scripting.V1`.

## Toolchain and module shape
- Project asset: `ScriptAsset { asset GUID, revision, source files, entrypoint types, API major = 1, published content hash, compiler options, capability manifest, dependencies }`. User writes **valid C#**; no DSL, new meanings for `#`/`@`/`{}` or preprocessing.
- Compiler: Roslyn C# compilation with .NET 10 pinned reference assemblies, SDK reference and **approved allowlisted dependencies only**; `unsafe` forbidden and P/Invoke/reflection/process/thread/file/network APIs rejected by policy analyzer. Compiler plus analyzer is defense in depth, never sandbox substitute. Dynamic compilation service isolated from public host. Build output signed/hashed and manifest-validated before worker load.
- Each class has `[MudScript("stable.module-id")]`. Each hook method: `public HookDecision Name(HookContext ctx, TEvent evt)`, instance, non-generic, synchronous. `TEvent` must exactly match canonical event type for attributed hook ID. Multiple methods can bind same hook ID to different assets, but each **HookBinding** specifies one method, owner and version. Binding requires capability manifest.
- `[MudGraphCallable("stable.node-id")]` exposes an otherwise valid public method with a strictly validated signature. v1 accepts `bool`, `int`, `long`, `double`, `string`, `Guid`, `AssetRef`, `EntityRef`, and nullable/read-only immutable DTOs for data ports; `HookDecision` for typed action-port output (same effects/authority). No pointer, dynamic, arbitrary `object` or reflection-backed node.
- No user-controlled `async Task` hook, `void` handler, `CancellationToken` thread escape or fire-and-forget. Long duration is expressed via durable server-managed workflow + timer hook.
- Static data in worker is **not persistent authoritative state** and may disappear on worker restart. Persistent flags/quest values live in engine schema and are read in approved snapshots; write through typed effects.

## Public C# core: actual names (see source)
| Type | Contract |
|---|---|
| `AssetRef(Guid Id,uint Revision)` | Immutable version-pinned asset; resolved in project release manifest; cross-world context checked |
| `EntityRef(Guid WorldId,ulong EntityId,uint Generation)` | Opaque world-scoped entity identity; generation prevents stale reuse |
| `ScopeRef(Guid Id,uint Revision)` | World region/event scope |
| `HookContext` | Invocation/request GUID, bound asset, owner/actor/target, authorized immutable snapshot, Before/After |
| `ActorSnapshot` | Trusted entity ref, display name, normalization-derived NameKey, quest attempts, aboard vehicles |
| `QuestAttemptSnapshot` | Attempt UUID, quest asset revision, state, credited objective keys, `ReadyToTurnIn` |
| `WorldReadSnapshot` | Revision, in-transit vehicle set, active event-definition set |
| `MudEvent` and derived records | Server-origin validated event facts; see event catalog |
| `HookDecision` | Continue, Append, Replace, Veto, Defer, EnqueueAfter; strict phase restrictions |
| `GameEffect` union records | Effect intent only. C++ validates, commits, records idempotency and events |
| `[MudHook]`, `[MudGraphCallable]` | Attribute registry metadata. Not a security gate |

## Before/After rules
- `Continue`: pass through default; may not carry effects.
- `Append`: stage additional effects **with** default in one before-hook transaction; default remains enforced.
- `Replace`: suppress default and stage exact effect plan. Quest/reward default side effects never happen silently.
- `Veto`: no success mutation; return configured safe `ErrorCode`, no sensitive data.
- `Defer`: ask engine to create a durable dialogue/choice session; no partial success state is committed; resolution sends a distinct authenticated command.
- `EnqueueAfter`: only permitted for **After** hooks; enqueue separate durable command(s) after original commit. Failure cannot roll back original transition and is independently observable/retriable.
- Multiple bindings: deterministic sort by (priority, stable binding UUID); one Replace/Veto/Defer terminal outcome per defined hook. Conflicting terminal decisions fail publish; do not guess precedence. The policy must be expressed in asset validation.

## Exact linkage example
`[MudHook("quest.turn_in.before")] public HookDecision JoeTurnIn(HookContext ctx, QuestTurnInEvent e)`.
Binding: owner = quest `FindJoe`; target NPC Joe; hookId = `quest.turn_in.before`; method = `JoeTurnIn`; moduleId = `mudmaker.examples.midnight-express`; mode = Replace; quest condition = ReadyToTurnIn; capabilities = Quest.Complete / WorldEvent.Stop / Reward.Grant / Reward.Roll; failure = fail-closed.

## API rules and no hidden mutation
All `GameEffect` variants are **requests**, validated against actor rights, hook capability, asset/world identity, revision, game rules, event origin and onceKey. Scripts never manage entities using native pointers, reach DB/HTTP, choose reward randomness, choose player recipients from unsafe strings or send narration directly. Asset revision and hook schema are pinned to release. No script/graph can mint capability merely by constructing a DTO.

## Compiler diagnostics
Errors need stable code (e.g. `MM-SDK-001` wrong signature), source file:line:column, expected/received event type, link to exact indexed SDK doc. The editor autocomplete/language server reads generated SDK types and manifest metadata, not speculative pseudo API.
