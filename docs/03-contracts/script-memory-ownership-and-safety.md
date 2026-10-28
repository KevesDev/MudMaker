# Memory Ownership and Security at C++/C# / Graph Boundary

**Status:** mandatory safety requirements, implementation model PROPOSED. **Owner:** C++ ECS runtime, Script Host, IPC/ABI and Security. **Supports:** multiworld multiplayer + untrusted creator code.

## Three separate safety goals
1. **Memory correctness:** C++ use-after-free, double-free, stale entity identity, races, overrun and invalid lifetime.
2. **Security isolation:** a creator script should not reach files, processes, network, secrets or other tenants, even if it is valid C# and compiles.
3. **Game-rule correctness:** script cannot bypass authorization, phasing/hidden NPC checks, duplicate rewards, atomic quest transitions or schema validation.

A managed language solves some memory hazards in its own process, but **does not automatically protect a native host** from malicious same-process code. OS process isolation, constrained dependencies and typed IPC are primary trust boundaries for arbitrary public scripts.

## Never expose these to creators
- `void*`, `int*`, raw native ECS storage addresses, mutable component references, STL containers/iterators, memory allocators or host DLL entrypoints;
- `GCHandle`, `IntPtr`, unsafe C# compilation, arbitrary P/Invoke, direct reflection/host assembly load, unmanaged function pointers;
- DB connections, credentials, network sockets, filesystem locations, world scheduler internals or unrestricted per-world globals.

## Proposed object/handle model
EntityRef fields: worldInstanceId, opaqueEntityId, generation/version (or equivalent stale reuse guard), optional capability/ref restriction. Serialized over process boundary by value. Script reads immutable typed component snapshot or bounded query result. No pointer to live ECS storage; no ref-counted C++ object crossing as borrowed pointer.
- Every returned handle validated at use and commit: live? same world/instance? visible/targetable to actor? capability allows read/write? component version still expected?
- Snapshot reads can be stale; effect plan includes precondition/expected revision and is rejected/retried according to documented command contract, not silently written.
- Handle lifecycle: entity destroyed, moved to other instance, project version changed or worker restarted -> old handle invalid, typed error. Never repurpose the ID without generation validation.
- Child/parent containment and move across worlds are atomic and strongly owned; no foreign-pointer through a graph node.
- Dynamic arrays/maps/text returned as ownership-defined serialized copies; payload size/recursion capped. No shared writeable memory mapped from client/worker to ECS hot state.

## C++ core ownership rules
- RAII for resources and services; smart pointers for owning polymorphic resources when necessary; ECS registry controls component and entity lifetime, not random shared_ptr graph across world state.
- Clear threading model (single writer or formally synchronized access; no raw concurrent mutation of ECS query results); worker threads for read-only/snapshot prep and permitted task queues.
- ECS structural changes invalidate iterators/views per chosen library rules; mutations must be staged and revalidated. Debug assertions/invariant checks plus sanitizers (AddressSanitizer, UndefinedBehaviorSanitizer, ThreadSanitizer where toolchain permits) and fuzz/property tests.
- Restrict direct plugin native DLL loading to trusted operator-only extensions if offered; compiling creator C++ into server process is not acceptable as public script extension by default.
- Separate world instances, buffers and caches; no globally shared per-world mutable state. Simulated game clocks and deterministic seeds are scoped to world.

## C# worker memory and reliability
- CLR GC owns managed objects inside worker; worker process may be terminated if memory/time quota breached. Resource limits must apply at OS/host level; no expectation that untrusted code politely cooperates with `CancellationToken`.
- .NET `AssemblyLoadContext` is for load/unload, not a security boundary. Worker needs sandboxed OS user/container/process rights, restricted mounted files, disabled network by default, controlled dependencies and no tenant secrets.
- Validate serialization and message sizes both directions. Worker receives minimal execution context, emits typed effect plans only. No direct ECS write, no native memory addresses.
- Crash/worker restart: engine remains healthy, keeps last committed transaction, records required hook as failed/pending and resumes or rejects per durable policy, never treats missing callback as success.
- Multi-tenant design: per-instance/process/isolation granularity needs risk/overhead benchmarks; process pooling cannot mix trust scopes accidentally.
- Enforce instruction/time budget for graph VM and separate wall/CPU/memory budgets for managed worker; guard infinite loops, recursion and excessive stdout/log.
- Compilation service runs in independent restricted process; published artifacts hashed/pinned, dependencies allowlisted and verified.

## FFI/IPC contract
Use versioned typed messages (schema-validated) with worldId, script/graph asset version, request/correlation ID, actor and instance refs, snapshot revision, capability manifest, deadlines, typed payload/EffectPlan. Prefer explicit serialization over arbitrary object marshalling. Backward-compatibility/migration and stale-handle behavior are documented. Batch where appropriate, benchmark p99 latency for invocation sizes; don't add synchronized one-per-entity IPC call on tick hot path without evidence.

## Testing and audit requirements
- Dangling entity handles after destruction/reuse, stale revisions, cross-world refs, invalid component type, pointer/struct layout fuzzing.
- Thread contention while train boards and world instances run; no double location/ownership.
- Script attempts restricted filesystem, network, process, reflection, native call and classloader escape; OS boundary actually denies it.
- Memory exhaust, infinite loop, enormous IPC payload, worker kill and restart; no server crash/unbounded queue.
- Cross-tenant worlds and sessions; no spying on hidden Joe or stealing quest reward.
- Crash between default quest grant and custom start-event: durable outbox or transaction prevents duplicate/missing effects.
- Sanitizer-enabled C++ tests and real in-process/native fault simulations; no fake mock that always returns safe.
- Benchmark memory per world/worker, ECS allocations and p95/p99 command latency; hardware, workload and targets recorded.

## Approval gates
Engine C++ adoption, ECS library, writer/threading model, code scripting language, worker OS isolation, IPC schema, allocations and sanitizer/toolchain matrix, hot reload and resource budgets. A sub-agent cannot guess raw pointer lifetimes or pretend managed GC is a security sandbox.
